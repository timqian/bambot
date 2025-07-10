# 🎮 Intégration Contrôleur Stadia - Documentation

## Vue d'ensemble

L'intégration du contrôleur Stadia permet un contrôle précis et intuitif du robot SO101 via les sticks analogiques, boutons et triggers. Le système utilise la Web Gamepad API et fonctionne en mode exclusif avec le contrôle clavier.

## 🏗️ Architecture du Système

### Composants Principaux

```mermaid
graph TD
    A[Stadia Controller] --> B[Web Gamepad API]
    B --> C[StadiaDebugger]
    C --> D[GamepadControlPanel]
    D --> E[useRobotControl]
    E --> F[feetech.js SDK]
    F --> G[Robot SO101]
    
    H[STADIA_SO101_MAPPING] --> C
    I[gamepadActive State] --> J[KeyboardControl]
```

### Stack Technologique

- **Hardware**: Contrôleur Stadia via Bluetooth
- **API**: Web Gamepad API (navigator.getGamepads)
- **Polling**: requestAnimationFrame (~60fps)
- **Communication**: Même pipeline que le clavier
- **UI**: React + TypeScript + Tailwind
- **Support exclusif**: Contrôleur Stadia uniquement
- **Sécurité**: Détection de collision intégrée

## 🎮 Mapping Contrôleur Stadia

### Méthode de Contrôle Améliorée

Le système utilise un contrôle par incrément optimisé :
- **Vitesse**: 0.85° par frame (augmentée de 70% vs 0.5° initial)
- **Fréquence**: ~60fps via requestAnimationFrame
- **Sécurité**: Détection de collision en temps réel
- **Respect des limites**: Joints s'arrêtent aux limites min/max
- **Mode exclusif**: Désactivation automatique du contrôle clavier

### Configuration Complète

```typescript
// lib/gamepadDebug.ts - Mapping spécifique au contrôleur Stadia
export const STADIA_SO101_MAPPING: Record<string, GamepadMapping> = {
  // Sticks analogiques (contrôle continu)
  'axis_0': { joint: 'wrist_roll', scale: 1.0 },      // Left Stick X
  'axis_1': { joint: 'wrist_pitch', scale: -1.0 },    // Left Stick Y (inversé)
  'axis_2': { joint: 'base_rotation', scale: 1.0 },   // Right Stick X
  'axis_3': { joint: 'shoulder_pitch', scale: -1.0 }, // Right Stick Y (inversé)
  
  // Boutons d'épaule (contrôle digital)
  'button_4': { joint: 'elbow_flex', value: -1.0 },   // L1 → Coude bas
  'button_5': { joint: 'elbow_flex', value: 1.0 },    // R1 → Coude haut
  
  // Boutons face (contrôle pince)
  'button_0': { joint: 'gripper', value: -1.0 },      // A → Fermer pince
  'button_1': { joint: 'gripper', value: 1.0 },       // B → Ouvrir pince
  
  // Fonctions spéciales (non-robot)
  'button_2': { joint: 'take_photo', value: 1.0 },    // X → Photo
  'button_3': { joint: 'end_episode', value: 1.0 },   // Y → Fin épisode
  
  // D-pad (contrôles alternatifs)
  'button_12': { joint: 'shoulder_pitch', value: 1.0 }, // D-Up
  'button_13': { joint: 'shoulder_pitch', value: -1.0 }, // D-Down
  'button_14': { joint: 'base_rotation', value: -1.0 },  // D-Left
  'button_15': { joint: 'base_rotation', value: 1.0 },   // D-Right
};
```

### Mapping Physique Détaillé

| Contrôle | Input | Joint | Valeur | Description |
|----------|-------|-------|--------|-------------|
| **Left Stick X** | Axis 0 | wrist_roll (Servo 5) | -1.0 ↔ +1.0 | Rotation poignet |
| **Left Stick Y** | Axis 1 | wrist_pitch (Servo 4) | -1.0 ↔ +1.0 | Flexion poignet (inversé) |
| **Right Stick X** | Axis 2 | base_rotation (Servo 1) | -1.0 ↔ +1.0 | Rotation base |
| **Right Stick Y** | Axis 3 | shoulder_pitch (Servo 2) | -1.0 ↔ +1.0 | Élévation épaule (inversé) |
| **L1 Bumper** | Button 4 | elbow_flex (Servo 3) | -1.0 | Coude vers le bas |
| **R1 Bumper** | Button 5 | elbow_flex (Servo 3) | +1.0 | Coude vers le haut |
| **A Button** | Button 0 | gripper (Servo 6) | -1.0 | Fermer la pince |
| **B Button** | Button 1 | gripper (Servo 6) | +1.0 | Ouvrir la pince |
| **X Button** | Button 2 | take_photo | +1.0 | Prendre une photo |
| **Y Button** | Button 3 | end_episode | +1.0 | Terminer épisode |
| **D-Pad Up** | Button 12 | shoulder_pitch | +1.0 | Épaule haut |
| **D-Pad Down** | Button 13 | shoulder_pitch | -1.0 | Épaule bas |
| **D-Pad Left** | Button 14 | base_rotation | -1.0 | Base gauche |
| **D-Pad Right** | Button 15 | base_rotation | +1.0 | Base droite |

### 🛡️ Système de Sécurité

⚠️ **Note**: La détection de collision a été temporairement désactivée dans le code récent (ligne 154-157 de GamepadControlPanel.tsx) car elle causait des problèmes avec la position de départ.

Le système prévu inclut 4 zones de sécurité :
1. **Zone Épaule-Coude**: Empêche le coude de rentrer dans l'épaule
2. **Zone Base-Poignet**: Évite que le poignet touche la base
3. **Zone Coude Extrême**: Limite les positions dangereuses du coude
4. **Zone Poignet-Coude**: Empêche le contact poignet-coude

**Vitesse optimisée**: 0.85°/frame (53°/s) - 70% plus rapide que l'ancien système

## 🔄 Flux de Contrôle

### 1. Détection et Connexion

**Fichier**: `StadiaDebugger.detectGamepad()`

```typescript
public detectGamepad(): Gamepad | null {
  if (!this.isSupported()) {
    console.error('Gamepad API not supported');
    return null;
  }
  
  const gamepads = navigator.getGamepads();
  return Array.from(gamepads).find(gp => gp !== null) || null;
}

public isStadiaController(gamepad: Gamepad): boolean {
  const id = gamepad.id.toLowerCase();
  return id.includes('stadia') || id.includes('google');
}
```

### 2. Polling et Traitement

**Fichier**: `GamepadControlPanel.tsx:53-73`

```typescript
gamepadDebugger.start((joints: RobotJoints, state: GamepadState) => {
  setCurrentJoints(joints);
  
  // Conversion vers commandes robot
  if (isConnected) {
    const robotCommands: Record<string, number> = {}
    
    // Mapping des joints physiques
    if (Math.abs(joints.shoulder_pan) > 0.01) robotCommands.shoulder_pan = joints.shoulder_pan
    if (Math.abs(joints.shoulder_lift) > 0.01) robotCommands.shoulder_lift = joints.shoulder_lift
    // ... autres joints
    
    // Fonctions spéciales
    if (joints.take_photo > 0) {
      console.log('📸 Take Photo triggered!')
      // TODO: Implémentation capture photo
    }
    
    onJointCommand(robotCommands)
  }
})
```

### 3. Conversion Input → Commandes

**Fichier**: `StadiaDebugger.mapToRobotJoints()`

```typescript
public mapToRobotJoints(gamepad: Gamepad): RobotJoints {
  const joints: RobotJoints = { /* ... */ };
  
  // Traitement axes analogiques
  gamepad.axes.forEach((value, index) => {
    const key = `axis_${index}`;
    const mapping = STADIA_SO101_MAPPING[key];
    if (!mapping || !('scale' in mapping) || mapping.scale === undefined) return;
    
    let processedValue = value;
    
    // Deadzone pour sticks (axes 0-3)
    if (index < 4) {
      processedValue = this.applyDeadzone(value);
    }
    
    if (Math.abs(processedValue) > 0) {
      const command = processedValue * mapping.scale;
      const joint = mapping.joint as keyof RobotJoints;
      joints[joint] = command;
    }
  });
  
  // Traitement boutons digitaux
  gamepad.buttons.forEach((button, index) => {
    if (!button.pressed) return;
    
    const key = `button_${index}`;
    const mapping = STADIA_SO101_MAPPING[key];
    if (!mapping || !('value' in mapping) || mapping.value === undefined) return;
    
    const joint = mapping.joint as keyof RobotJoints;
    joints[joint] = mapping.value;
  });
  
  // Clamping gripper [-1, 1]
  joints.gripper = Math.max(-1, Math.min(1, joints.gripper));
  
  return joints;
}
```

### 4. Deadzone et Filtrage

```typescript
private applyDeadzone(value: number): number {
  if (Math.abs(value) < this.deadzone) return 0;
  const sign = value > 0 ? 1 : -1;
  return sign * (Math.abs(value) - this.deadzone) / (1.0 - this.deadzone);
}
```

**Paramètres**:
- **Deadzone**: 0.15 (15% pour éviter le drift)
- **Trigger Threshold**: 0.05 (5% pour micro-mouvements)

## 🎛️ Interface Utilisateur

### GamepadControlButton

**Fichier**: `GamepadControlButton.tsx`

```typescript
export function GamepadControlButton({ isActive, onClick }: GamepadControlButtonProps) {
  const [isGamepadConnected, setIsGamepadConnected] = useState(false)
  
  // Détection automatique
  useEffect(() => {
    const checkGamepad = () => {
      const gamepad = gamepadDebugger.detectGamepad()
      setIsGamepadConnected(!!gamepad)
    }
    
    checkGamepad()
    const interval = setInterval(checkGamepad, 1000)
    
    // Événements gamepad
    window.addEventListener('gamepadconnected', handleConnect)
    window.addEventListener('gamepaddisconnected', handleDisconnect)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('gamepadconnected', handleConnect)
      window.removeEventListener('gamepaddisconnected', handleDisconnect)
    }
  }, [gamepadDebugger])
  
  // Affichage conditionnel
  if (!isGamepadConnected) return null
  
  return (
    <Button>
      <div className="flex items-center space-x-2">
        <div className="text-lg">🎮</div>
        <span>Gamepad</span>
      </div>
      {/* Indicateur de connexion */}
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
    </Button>
  )
}
```

### GamepadControlPanel

**Caractéristiques**:
- **Position**: Gauche de l'écran (`top-4 left-4`)
- **Taille**: `w-96 h-[calc(100vh-8rem)]`
- **Sections**:
  - Informations contrôleur
  - États joints en temps réel
  - Mapping des contrôles
  - Fonctions spéciales

## 🔄 Mode Exclusif

### Basculement Automatique

**Fichier**: `RobotLoader.tsx:150-160`

```typescript
const toggleGamepadControl = () => {
  setShowGamepadControl((prev) => {
    const newState = !prev;
    setPanelStateToLocalStorage("gamepadControl", newState, robotName);
    // Fermeture automatique du clavier
    if (newState) {
      setShowControlPanel(false);
      setPanelStateToLocalStorage("keyboardControl", false, robotName);
    }
    return newState;
  });
};
```

### Désactivation Clavier

**Fichier**: `RevoluteJointsTable.tsx:96-98`

```typescript
useEffect(() => {
  // Pas d'écoute clavier si gamepad actif
  if (gamepadActive) {
    return;
  }
  
  // ... setup keyboard listeners
}, [gamepadActive]);
```

### Indication Visuelle

```typescript
return (
  <div className={`mt-4 ${gamepadActive ? 'opacity-50 pointer-events-none' : ''}`}>
    {gamepadActive && (
      <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <span className="text-lg">⌨️</span>
          <span className="font-semibold text-yellow-800">Keyboard Control Disabled</span>
        </div>
        <div className="text-sm text-yellow-700 mt-1">
          Gamepad control is active. Close the gamepad panel to re-enable keyboard control.
        </div>
      </div>
    )}
    {/* ... interface clavier grisée */}
  </div>
);
```

## 📊 Performance et Optimisation

### Paramètres de Performance

```typescript
// Fréquences et vitesses actuelles  
const GAMEPAD_UPDATE_STEP_DEGREES = 0.85; // Augmenté de 70% (vs 0.5)
const GAMEPAD_UPDATE_INTERVAL_MS = 16; // ~60fps
const MAX_SPEED = 53; // degrés par seconde (0.85 * 60)

// Seuils de détection
const DEBOUNCE_THRESHOLD = 0.01; // Seuil de changement significatif
const DEADZONE = 0.15; // 15% pour éviter le drift
const TRIGGER_THRESHOLD = 0.05; // 5% pour micro-mouvements

// Sécurité (actuellement désactivée)
const COLLISION_CHECK_ENABLED = false; // Désactivé temporairement
const LIMIT_ENFORCEMENT = true; // Respect des limites joints actif
```

### Optimisations

1. **Polling Intelligent**: Seulement si gamepad connecté
2. **Change Detection**: Envoi uniquement si valeurs changées
3. **Command Batching**: Groupage multi-joints
4. **Memory Management**: Cleanup des listeners
5. **Vitesse Améliorée**: 0.85°/frame (53°/s) - 70% plus rapide
6. **Respect des limites**: Arrêt automatique aux bornes min/max
7. **Interface Responsive**: Feedback visuel en temps réel

### Monitoring

```typescript
// Debug en temps réel
console.group('📊 Current Input State');
if (activeAxes.length > 0) {
  console.log('Active Axes:', activeAxes);
}
if (pressedButtons.length > 0) {
  console.log('Pressed Buttons:', pressedButtons);
}
if (activeJoints.length > 0) {
  console.log('🤖 Robot Commands:', activeJoints);
}
console.groupEnd();
```

## 🛠️ Configuration et Personnalisation

### Ajout d'un Nouveau Contrôleur

1. **Détection**:
```typescript
public isXboxController(gamepad: Gamepad): boolean {
  const id = gamepad.id.toLowerCase();
  return id.includes('xbox') || id.includes('xinput');
}
```

2. **Mapping**:
```typescript
export const XBOX_SO101_MAPPING: Record<string, GamepadMapping> = {
  // Différents indices de boutons/axes
  'axis_0': { joint: 'wrist_roll', scale: 1.0 },
  'button_0': { joint: 'gripper', value: -1.0 }, // A sur Xbox
  // ...
};
```

3. **Sélection**:
```typescript
const getControllerMapping = (gamepad: Gamepad) => {
  if (isStadiaController(gamepad)) return STADIA_SO101_MAPPING;
  if (isXboxController(gamepad)) return XBOX_SO101_MAPPING;
  return STADIA_SO101_MAPPING; // Default
};
```

### Personnalisation des Commandes

```typescript
// Modifier les échelles
const SENSITIVITY_SETTINGS = {
  sticks: 1.0,     // Multiplicateur sticks
  triggers: 0.8,   // Multiplicateur triggers
  buttons: 1.0     // Multiplicateur boutons
};

// Inverser des axes
const INVERT_SETTINGS = {
  leftStickY: true,  // Inversion Y gauche
  rightStickY: true, // Inversion Y droite
  leftStickX: false,
  rightStickX: false
};
```

## 🔧 Debugging et Troubleshooting

### Outils de Debug

1. **Page de Test**: `/gamepad-test`
2. **Console Logs**: États détaillés
3. **Visual Feedback**: Highlighting boutons pressés

### Problèmes Courants

| Problème | Cause | Solution |
|----------|-------|----------|
| Contrôleur non détecté | Bluetooth non connecté | Reconnecter + presser bouton |
| Mapping incorrect | Mauvais type détecté | Vérifier `gamepad.id` |
| Lag/Saccades | Polling trop fréquent | Ajuster requestAnimationFrame |
| Drift des sticks | Deadzone trop petite | Augmenter `DEADZONE` |

### Tests de Validation

```typescript
// Test de base
const gamepad = debugger.detectGamepad();
console.log('Gamepad detected:', !!gamepad);

// Test mapping
if (gamepad) {
  const joints = debugger.mapToRobotJoints(gamepad);
  console.log('Mapped joints:', joints);
}

// Test communication
debugger.start((joints) => {
  console.log('Real-time joints:', joints);
});
```

## 🎯 Bonnes Pratiques

### Développement

1. **Type Safety**: TypeScript strict pour éviter les erreurs
2. **Error Boundaries**: Gestion des pannes de contrôleur
3. **Graceful Degradation**: Fallback vers clavier
4. **Performance**: Éviter les re-renders inutiles

### UX/UI

1. **Feedback Visuel**: États clairs de connexion
2. **Mode Exclusif**: Une seule méthode active
3. **Documentation**: Aide contextuelle intégrée
4. **Accessibilité**: Support clavier conservé

### Production

1. **Browser Support**: Vérifier Web Gamepad API
2. **Error Handling**: Déconnexions inattendues
3. **Monitoring**: Logs de performance
4. **Versioning**: Backward compatibility

## 📈 État Actuel (Commit récent)

### ✅ Fonctionnalités Actives
- **Support exclusif Stadia Controller** via Bluetooth
- **Vitesse optimisée**: 53°/s (+70% vs version précédente)
- **Respect des limites joints** automatique
- **Mode exclusif** avec le contrôle clavier
- **Interface utilisateur** avec feedback visuel temps réel
- **Connexion/déconnexion robot** intégrée

### ⚠️ Fonctionnalités Temporairement Désactivées
- **Détection de collision**: Désactivée (lignes 154-157) car problèmes avec position de départ
- **Multi-contrôleurs**: Code de détection présent mais mapping Stadia uniquement

### 🔧 Dernières Améliorations
- Vitesse augmentée de 0.5° à 0.85° par frame
- Interface affichant le statut de sécurité ("🛡️ Disabled")
- Boutons de connexion/déconnexion robot dans le panel
- Avertissements de collision avec timeout de 2 secondes

---

*Documentation mise à jour pour bambot v2.1 - Intégration Contrôleur Stadia Optimisée*