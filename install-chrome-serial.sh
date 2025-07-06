#!/bin/bash

# Script d'installation de Chrome avec support Web Serial API pour Bambot
# Compatible Ubuntu/Debian/Linux Mint

set -e  # Arrêter le script en cas d'erreur

# Couleurs pour l'output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher avec couleur
print_status() {
    local status=$1
    local message=$2
    case $status in
        "OK")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
    esac
}

echo "🚀 INSTALLATION CHROME POUR WEB SERIAL API"
echo "=========================================="
echo

# Vérifier les permissions sudo
if ! sudo -n true 2>/dev/null; then
    print_status "INFO" "Ce script nécessite les permissions sudo"
    echo "Veuillez entrer votre mot de passe quand demandé"
    echo
fi

# 1. Vérifier la distribution
print_status "INFO" "Vérification de la distribution..."
if [ -f /etc/os-release ]; then
    . /etc/os-release
    print_status "INFO" "Distribution détectée: $PRETTY_NAME"
    
    # Vérifier si c'est une distribution compatible
    if [[ ! "$ID" =~ ^(ubuntu|debian|linuxmint|pop)$ ]]; then
        print_status "WARNING" "Distribution non testée. Le script peut ne pas fonctionner."
        read -p "Continuer quand même? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    print_status "ERROR" "Impossible de détecter la distribution"
    exit 1
fi

echo

# 2. Supprimer les installations conflictuelles
print_status "INFO" "Nettoyage des installations existantes..."

# Supprimer Chromium snap
if snap list chromium >/dev/null 2>&1; then
    print_status "WARNING" "Suppression de Chromium snap..."
    sudo snap remove chromium
    print_status "OK" "Chromium snap supprimé"
fi

# Supprimer Chrome/Chromium apt si présents
packages_to_remove="chromium-browser chromium google-chrome-stable google-chrome-unstable google-chrome-beta"
for package in $packages_to_remove; do
    if dpkg -l | grep -q "^ii.*$package"; then
        print_status "INFO" "Suppression de $package..."
        sudo apt remove -y "$package" 2>/dev/null || true
    fi
done

echo

# 3. Mettre à jour le système
print_status "INFO" "Mise à jour des paquets système..."
sudo apt update
print_status "OK" "Paquets mis à jour"

echo

# 4. Installer les dépendances
print_status "INFO" "Installation des dépendances..."
sudo apt install -y wget gnupg2 software-properties-common apt-transport-https ca-certificates curl
print_status "OK" "Dépendances installées"

echo

# 5. Ajouter la clé de signature Google
print_status "INFO" "Ajout de la clé de signature Google..."
curl -fsSL https://dl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor -o /usr/share/keyrings/google-chrome-keyring.gpg

# Ajouter le dépôt Chrome
print_status "INFO" "Ajout du dépôt Google Chrome..."
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list

# Mettre à jour la liste des paquets
sudo apt update
print_status "OK" "Dépôt Google Chrome ajouté"

echo

# 6. Installer Google Chrome
print_status "INFO" "Installation de Google Chrome..."
sudo apt install -y google-chrome-stable
print_status "OK" "Google Chrome installé"

echo

# 7. Vérifier l'installation
chrome_version=$(google-chrome --version 2>/dev/null || echo "Erreur")
if [[ "$chrome_version" == "Erreur" ]]; then
    print_status "ERROR" "Erreur lors de l'installation de Chrome"
    exit 1
else
    print_status "OK" "Chrome installé: $chrome_version"
fi

echo

# 8. Configurer les permissions utilisateur
print_status "INFO" "Configuration des permissions utilisateur..."

# Vérifier si l'utilisateur est dans le groupe dialout
current_user=$(whoami)
if groups "$current_user" | grep -q "dialout"; then
    print_status "OK" "L'utilisateur est déjà dans le groupe 'dialout'"
else
    print_status "INFO" "Ajout de l'utilisateur au groupe 'dialout'..."
    sudo usermod -a -G dialout "$current_user"
    print_status "OK" "Utilisateur ajouté au groupe 'dialout'"
    print_status "WARNING" "Vous devez vous déconnecter/reconnecter pour appliquer les changements"
fi

echo

# 9. Créer un script de lancement optimisé
print_status "INFO" "Création du script de lancement optimisé..."

launcher_script="/home/$current_user/.local/bin/chrome-serial"
mkdir -p "/home/$current_user/.local/bin"

cat > "$launcher_script" << 'EOF'
#!/bin/bash
# Script de lancement Chrome optimisé pour Web Serial API

# Flags pour activer Web Serial API
CHROME_FLAGS=(
    --enable-experimental-web-platform-features
    --enable-web-serial-api
    --enable-features=WebSerial
    --no-sandbox
    --disable-web-security
    --user-data-dir=/tmp/chrome-serial-session
)

# Lancer Chrome avec les flags
exec google-chrome "${CHROME_FLAGS[@]}" "$@"
EOF

chmod +x "$launcher_script"
print_status "OK" "Script de lancement créé: $launcher_script"

echo

# 10. Créer un raccourci bureau
print_status "INFO" "Création du raccourci bureau..."

desktop_file="/home/$current_user/Desktop/Chrome-Serial.desktop"
cat > "$desktop_file" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Chrome Serial API
Comment=Chrome avec Web Serial API activé pour Bambot
Exec=$launcher_script
Icon=google-chrome
Terminal=false
StartupNotify=true
Categories=Network;WebBrowser;
MimeType=text/html;text/xml;application/xhtml+xml;
EOF

chmod +x "$desktop_file"
print_status "OK" "Raccourci bureau créé"

echo

# 11. Tester les modules série
print_status "INFO" "Vérification des modules série..."

# Charger le module ch341 si pas déjà fait
if ! lsmod | grep -q ch341; then
    print_status "INFO" "Chargement du module ch341..."
    sudo modprobe ch341 || print_status "WARNING" "Impossible de charger ch341"
fi

if ! lsmod | grep -q usbserial; then
    print_status "INFO" "Chargement du module usbserial..."
    sudo modprobe usbserial || print_status "WARNING" "Impossible de charger usbserial"
fi

print_status "OK" "Modules série vérifiés"

echo

# 12. Créer un fichier de test rapide
print_status "INFO" "Création d'un fichier de test..."

test_file="/home/$current_user/Desktop/test-serial-api.html"
cat > "$test_file" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Test Web Serial API</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f0f0f0; }
        .container { max-width: 800px; margin: auto; background: white; padding: 20px; border-radius: 10px; }
        button { padding: 10px 20px; margin: 10px; background: #4CAF50; color: white; border: none; cursor: pointer; border-radius: 5px; }
        button:hover { background: #45a049; }
        .success { color: green; font-weight: bold; }
        .error { color: red; font-weight: bold; }
        pre { background: #f4f4f4; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Test Web Serial API</h1>
        <p>Ce fichier teste si l'API Web Serial fonctionne correctement.</p>
        
        <button onclick="testAPI()">1. Tester l'API</button>
        <button onclick="requestPort()">2. Demander un port</button>
        
        <div id="results"></div>
    </div>

    <script>
        const results = document.getElementById('results');
        
        function log(message, isError = false) {
            const div = document.createElement('div');
            div.innerHTML = `<strong>${new Date().toLocaleTimeString()}:</strong> ${message}`;
            div.className = isError ? 'error' : 'success';
            results.appendChild(div);
        }
        
        function testAPI() {
            results.innerHTML = '<h3>Test de l\'API Web Serial:</h3>';
            
            log(`navigator.serial disponible: ${!!navigator.serial}`);
            log(`Contexte sécurisé: ${window.isSecureContext}`);
            log(`Protocole: ${window.location.protocol}`);
            log(`User Agent: ${navigator.userAgent}`);
            
            if (navigator.serial) {
                log('✅ API Web Serial activée!');
                log(`Type requestPort: ${typeof navigator.serial.requestPort}`);
                log(`Type getPorts: ${typeof navigator.serial.getPorts}`);
            } else {
                log('❌ API Web Serial non disponible', true);
                log('Vérifiez que Chrome est lancé avec les bons flags', true);
            }
        }
        
        async function requestPort() {
            if (!navigator.serial) {
                log('❌ API non disponible', true);
                return;
            }
            
            try {
                log('Demande d\'autorisation pour un port série...');
                const port = await navigator.serial.requestPort();
                
                if (port) {
                    const info = port.getInfo();
                    log('✅ Port sélectionné avec succès!');
                    log(`VID: 0x${(info.usbVendorId||0).toString(16).padStart(4,'0')}`);
                    log(`PID: 0x${(info.usbProductId||0).toString(16).padStart(4,'0')}`);
                    log('🎉 L\'API Web Serial fonctionne parfaitement!');
                }
            } catch (error) {
                if (error.name === 'NotFoundError') {
                    log('❌ Aucun port trouvé ou annulé', true);
                } else {
                    log(`❌ Erreur: ${error.message}`, true);
                }
            }
        }
        
        // Test automatique au chargement
        setTimeout(testAPI, 1000);
    </script>
</body>
</html>
EOF

print_status "OK" "Fichier de test créé: $test_file"

echo

# 13. Instructions finales
print_status "OK" "🎉 INSTALLATION TERMINÉE AVEC SUCCÈS!"
echo
echo "📋 PROCHAINES ÉTAPES:"
echo "==================="
echo
print_status "INFO" "1. Redémarrez votre session utilisateur pour appliquer les groupes:"
echo "   - Déconnectez-vous et reconnectez-vous"
echo "   - OU exécutez: newgrp dialout"
echo
print_status "INFO" "2. Lancez Chrome avec Web Serial API:"
echo "   - Utilisez le raccourci 'Chrome Serial API' sur le bureau"
echo "   - OU exécutez: $launcher_script"
echo
print_status "INFO" "3. Testez l'API:"
echo "   - Ouvrez le fichier: $test_file"
echo "   - Cliquez sur 'Tester l'API' puis 'Demander un port'"
echo
print_status "INFO" "4. Testez Bambot:"
echo "   - Allez sur http://localhost:3000"
echo "   - Cliquez sur 'Connect Follower Robot'"
echo "   - Votre périphérique 1a86:55d3 devrait apparaître!"
echo

print_status "WARNING" "IMPORTANT: Redémarrez votre session avant de tester!"
echo

# 14. Créer un script de vérification post-installation
verification_script="/home/$current_user/.local/bin/verify-chrome-serial"
cat > "$verification_script" << 'EOF'
#!/bin/bash
# Script de vérification Chrome + Web Serial API

echo "🔍 VÉRIFICATION CHROME + WEB SERIAL API"
echo "======================================="

# Vérifier Chrome
if command -v google-chrome >/dev/null 2>&1; then
    echo "✅ Chrome installé: $(google-chrome --version)"
else
    echo "❌ Chrome non trouvé"
fi

# Vérifier les groupes
if groups | grep -q dialout; then
    echo "✅ Utilisateur dans le groupe dialout"
else
    echo "❌ Utilisateur PAS dans le groupe dialout"
    echo "   Solution: newgrp dialout"
fi

# Vérifier les devices série
if ls /dev/ttyACM* >/dev/null 2>&1 || ls /dev/ttyUSB* >/dev/null 2>&1; then
    echo "✅ Devices série détectés:"
    ls -la /dev/ttyACM* /dev/ttyUSB* 2>/dev/null | head -5
else
    echo "⚠️  Aucun device série détecté"
fi

# Vérifier les modules
if lsmod | grep -q "ch341\|usbserial"; then
    echo "✅ Modules série chargés"
else
    echo "⚠️  Modules série non chargés"
    echo "   Solution: sudo modprobe ch341"
fi

echo
echo "Pour tester: ouvrez ~/Desktop/test-serial-api.html avec Chrome Serial API"
EOF

chmod +x "$verification_script"
print_status "OK" "Script de vérification créé: $verification_script"

echo
print_status "INFO" "Vous pouvez vérifier l'installation à tout moment avec:"
echo "   $verification_script"
echo

exit 0