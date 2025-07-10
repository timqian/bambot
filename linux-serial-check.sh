#!/bin/bash

# Script de diagnostic série Linux pour Bambot
# Usage: ./linux-serial-check.sh

# Fichier de sortie
OUTPUT_FILE="/home/rtx/pro2robot/resources/bambot/diagnostic-output.txt"

# Fonction pour écrire à la fois sur stdout et dans le fichier
log_output() {
    echo "$1" | tee -a "$OUTPUT_FILE"
}

# Vider le fichier de sortie
> "$OUTPUT_FILE"

log_output "🐧 DIAGNOSTIC SÉRIE LINUX POUR BAMBOT"
log_output "======================================"
log_output "Date: $(date)"
log_output ""

# Couleurs pour l'output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher avec couleur et sauvegarder
print_status() {
    local status=$1
    local message=$2
    local status_symbol=""
    case $status in
        "OK")
            status_symbol="✅"
            echo -e "${GREEN}$status_symbol $message${NC}"
            ;;
        "WARNING")
            status_symbol="⚠️"
            echo -e "${YELLOW}$status_symbol $message${NC}"
            ;;
        "ERROR")
            status_symbol="❌"
            echo -e "${RED}$status_symbol $message${NC}"
            ;;
        "INFO")
            status_symbol="ℹ️"
            echo -e "${BLUE}$status_symbol $message${NC}"
            ;;
    esac
    # Sauvegarder sans couleurs dans le fichier
    echo "$status_symbol $message" >> "$OUTPUT_FILE"
}

log_output "1. VÉRIFICATION UTILISATEUR ET GROUPES"
log_output "======================================"

# Vérifier l'utilisateur actuel
current_user=$(whoami)
print_status "INFO" "Utilisateur actuel: $current_user"

# Vérifier les groupes
user_groups=$(groups)
print_status "INFO" "Groupes de l'utilisateur: $user_groups"

# Vérifier si dialout est présent
if echo "$user_groups" | grep -q "dialout"; then
    print_status "OK" "L'utilisateur est dans le groupe 'dialout'"
else
    print_status "ERROR" "L'utilisateur N'EST PAS dans le groupe 'dialout'"
    echo -e "${YELLOW}Solution: sudo usermod -a -G dialout $current_user${NC}"
    echo -e "${YELLOW}Puis redémarrer la session ou faire: newgrp dialout${NC}"
    log_output "Solution: sudo usermod -a -G dialout $current_user"
    log_output "Puis redémarrer la session ou faire: newgrp dialout"
fi

log_output ""
log_output "2. DÉTECTION DES PÉRIPHÉRIQUES USB SÉRIE"
log_output "========================================"

# Lister les périphériques USB série
usb_devices=$(lsusb | grep -i "serial\|uart\|ch340\|ftdi\|cp210\|prolific")
if [ -n "$usb_devices" ]; then
    print_status "OK" "Périphériques USB série détectés:"
    echo "$usb_devices" | while read -r line; do
        echo "    $line"
        echo "    $line" >> "$OUTPUT_FILE"
    done
else
    print_status "ERROR" "Aucun périphérique USB série détecté"
    print_status "INFO" "Vérifiez que le robot est connecté via USB"
fi

log_output ""
log_output "3. VÉRIFICATION DES DEVICES SÉRIE"
log_output "================================="

# Vérifier les devices série
serial_devices=$(ls /dev/ttyUSB* /dev/ttyACM* 2>/dev/null)
if [ -n "$serial_devices" ]; then
    print_status "OK" "Devices série trouvés:"
    for device in $serial_devices; do
        if [ -c "$device" ]; then
            permissions=$(ls -la "$device")
            echo "    $permissions"
            echo "    $permissions" >> "$OUTPUT_FILE"
            
            # Vérifier si l'utilisateur peut accéder au device
            if [ -w "$device" ]; then
                print_status "OK" "Accès en écriture à $device"
            else
                print_status "ERROR" "Pas d'accès en écriture à $device"
            fi
        fi
    done
else
    print_status "ERROR" "Aucun device série trouvé (/dev/ttyUSB*, /dev/ttyACM*)"
    print_status "INFO" "Le périphérique USB est détecté mais pas de device créé"
    print_status "INFO" "Vérifiez les drivers et permissions"
fi

log_output ""
log_output "4. VÉRIFICATION DES DRIVERS"
log_output "==========================="

# Vérifier les modules chargés
modules_loaded=""
for module in usbserial ch341 ftdi_sio cp210x pl2303; do
    if lsmod | grep -q "^$module"; then
        print_status "OK" "Module $module chargé"
        modules_loaded="yes"
    fi
done

if [ -z "$modules_loaded" ]; then
    print_status "WARNING" "Aucun module série USB chargé"
    print_status "INFO" "Essayez: sudo modprobe ch341 (pour CH340/CH341)"
    print_status "INFO" "Essayez: sudo modprobe ftdi_sio (pour FTDI)"
    print_status "INFO" "Essayez: sudo modprobe cp210x (pour CP210x)"
fi

log_output ""
log_output "5. INFORMATIONS SYSTÈME"
log_output "======================"

# Version du kernel
kernel_version=$(uname -r)
print_status "INFO" "Version du kernel: $kernel_version"

# Distribution
if [ -f /etc/os-release ]; then
    distro=$(grep PRETTY_NAME /etc/os-release | cut -d'"' -f2)
    print_status "INFO" "Distribution: $distro"
fi

log_output ""
log_output "6. MESSAGES KERNEL (nécessite sudo)"
log_output "==================================="

# Vérifier les messages kernel (nécessite sudo)
if sudo -n true 2>/dev/null; then
    print_status "INFO" "Messages kernel récents pour USB/série:"
    sudo dmesg | grep -i "usb\|serial\|ch341\|ftdi" | tail -5 | while read -r line; do
        echo "    $line"
        echo "    $line" >> "$OUTPUT_FILE"
    done
else
    print_status "WARNING" "Sudo requis pour voir les messages kernel"
    print_status "INFO" "Exécutez: sudo dmesg | grep -i usb | tail -10"
fi

log_output ""
log_output "7. SOLUTIONS RECOMMANDÉES"
log_output "========================="

# Générer des solutions basées sur les résultats
if ! echo "$user_groups" | grep -q "dialout"; then
    log_output "ÉTAPE 1: Ajouter l'utilisateur au groupe dialout"
    log_output "sudo usermod -a -G dialout $current_user"
    log_output "newgrp dialout  # ou redémarrer la session"
    log_output ""
fi

if [ -z "$serial_devices" ] && [ -n "$usb_devices" ]; then
    log_output "ÉTAPE 2: Charger le driver approprié"
    # Détecter le type de chip
    if lsusb | grep -q "1a86"; then
        log_output "sudo modprobe ch341  # Pour CH340/CH341"
    elif lsusb | grep -q "0403"; then
        log_output "sudo modprobe ftdi_sio  # Pour FTDI"
    elif lsusb | grep -q "10c4"; then
        log_output "sudo modprobe cp210x  # Pour CP210x"
    else
        log_output "sudo modprobe usbserial  # Driver générique"
    fi
    log_output ""
fi

log_output "ÉTAPE 3: Tester l'API Web Serial"
log_output "1. Ouvrir Chrome/Chromium"
log_output "2. Aller sur chrome://flags/"
log_output "3. Activer 'Experimental Web Platform features'"
log_output "4. Redémarrer le navigateur"
log_output "5. Tester avec le fichier debug HTML"
log_output ""

log_output "ÉTAPE 4: Test manuel"
if [ -n "$serial_devices" ]; then
    first_device=$(echo "$serial_devices" | head -1)
    log_output "echo 'test' > $first_device  # Test d'écriture"
    log_output "timeout 2 cat $first_device  # Test de lecture"
fi

log_output ""
log_output "🔧 Diagnostic terminé!"
log_output "Fichier de sortie: $OUTPUT_FILE"
log_output "Si le problème persiste, exécutez ce script après chaque modification."

echo
echo "🔧 Diagnostic terminé!"
echo "📄 Résultats sauvegardés dans: $OUTPUT_FILE"