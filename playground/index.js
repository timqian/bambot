import {
  WebGLRenderer,
  PerspectiveCamera,
  Scene,
  Mesh,
  PlaneGeometry,
  ShadowMaterial,
  DirectionalLight,
  PCFSoftShadowMap,
  // sRGBEncoding,
  Color,
  AmbientLight,
  Box3,
  LoadingManager,
  MathUtils,
  MeshPhysicalMaterial,
  DoubleSide,
  ACESFilmicToneMapping,
  CanvasTexture,
  Float32BufferAttribute,
  RepeatWrapping,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import URDFLoader from 'urdf-loader';
// 导入控制工具函数
import { setupKeyboardControls, setupControlPanel } from './robotControls.js';

// 声明为全局变量
let scene, camera, renderer, controls;
// 将robot设为全局变量，便于其他模块访问
window.robot = null;
let keyboardUpdate;

init();
render();

function init() {

  scene = new Scene();
  scene.background = new Color(0x263238);

  camera = new PerspectiveCamera();
  camera.position.set(5, 5, 5);
  camera.lookAt(0, 0, 0);

  renderer = new WebGLRenderer({ antialias: true });
  // renderer.outputEncoding = sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.physicallyCorrectLights = true;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;
  document.body.appendChild(renderer.domElement);

  const directionalLight = new DirectionalLight(0xffffff, 1.0);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.setScalar(1024);
  directionalLight.position.set(5, 30, 5);
  scene.add(directionalLight);

  // Add second directional light for better reflections
  const directionalLight2 = new DirectionalLight(0xffffff, 0.8);
  directionalLight2.position.set(-2, 10, -5);
  scene.add(directionalLight2);

  const ambientLight = new AmbientLight(0xffffff, 0.3);
  scene.add(ambientLight);

  // Create reflective floor (MuJoCo style)
  const groundMaterial = new MeshPhysicalMaterial({
    color: 0x808080,
    metalness: 0.7,
    roughness: 0.3,
    reflectivity: 0.1,
    clearcoat: 0.3,
    side: DoubleSide,
    transparent: true,     // 启用透明度
    opacity: 0.7,          // 设置透明度为0.7（可以根据需要调整，1.0为完全不透明）
  });
  
  // 创建格子纹理的地面
  const gridSize = 60;
  const divisions = 60;
  
  // 创建网格地面
  const ground = new Mesh(new PlaneGeometry(gridSize, gridSize, divisions, divisions), groundMaterial);
  
  // 添加格子纹理
  const geometry = ground.geometry;
  const positionAttribute = geometry.getAttribute('position');
  
  // 创建格子纹理的UV坐标
  const uvs = [];
  const gridScale = 0.01; // 控制格子的密度
  
  for (let i = 0; i < positionAttribute.count; i++) {
    const x = positionAttribute.getX(i);
    const y = positionAttribute.getY(i);
    
    uvs.push(x * gridScale, y * gridScale);
  }
  
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  
  // 更新材质，添加格子纹理
  groundMaterial.map = createGridTexture();
  groundMaterial.roughnessMap = createGridTexture();
  
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 4;
  controls.target.y = 1;
  controls.update();

  // 直接加载bambot模型
  function loadBambotModel() {
    const manager = new LoadingManager();
    const loader = new URDFLoader(manager);

    loader.load(`/URDF/bambot.urdf`, result => {
      window.robot = result;
    });

    // 等待模型加载完成
    manager.onLoad = () => {
      window.robot.rotation.x = - Math.PI / 2;
      window.robot.rotation.z = - Math.PI;
      window.robot.traverse(c => {
        c.castShadow = true;
      });
      console.log(window.robot.joints);
      // 记录关节限制信息到控制台，便于调试
      logJointLimits(window.robot);
      
      window.robot.updateMatrixWorld(true);

      const bb = new Box3();
      bb.setFromObject(window.robot);

      window.robot.scale.set(15, 15, 15);
      window.robot.position.y -= bb.min.y;
      scene.add(window.robot);

      // Initialize keyboard controls
      keyboardUpdate = setupKeyboardControls(window.robot);
    };
  }

  // 初始加载模型
  loadBambotModel();

  onResize();
  window.addEventListener('resize', onResize);

  // Setup UI for control panel
  setupControlPanel();
}

/**
 * 输出关节限制信息到控制台
 * @param {Object} robot - 机器人对象
 */
function logJointLimits(robot) {
  if (!robot || !robot.joints) return;
  
  console.log("Robot joint limits:");
  Object.entries(robot.joints).forEach(([name, joint]) => {
    console.log(`Joint: ${name}`);
    console.log(`  Type: ${joint.jointType}`);
    
    if (joint.jointType !== 'fixed' && joint.jointType !== 'continuous') {
      console.log(`  Limits: ${joint.limit.lower.toFixed(4)} to ${joint.limit.upper.toFixed(4)} rad`);
      console.log(`  Current value: ${Array.isArray(joint.jointValue) ? joint.jointValue.join(', ') : joint.jointValue}`);
    } else if (joint.jointType === 'continuous') {
      console.log(`  No limits (continuous joint)`);
    } else {
      console.log(`  No limits (fixed joint)`);
    }
  });
}

function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function render() {
  requestAnimationFrame(render);
  
  // Update joint positions based on keyboard input
  if (keyboardUpdate) {
    keyboardUpdate();
  }
  
  renderer.render(scene, camera);
}

// 添加创建格子纹理的函数
function createGridTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  
  const context = canvas.getContext('2d');
  
  // 填充底色
  context.fillStyle = '#808080';
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // 绘制格子线
  context.lineWidth = 1;
  context.strokeStyle = '#606060';
  
  const cellSize = 32; // 每个格子的大小
  
  for (let i = 0; i <= canvas.width; i += cellSize) {
    context.beginPath();
    context.moveTo(i, 0);
    context.lineTo(i, canvas.height);
    context.stroke();
  }
  
  for (let i = 0; i <= canvas.height; i += cellSize) {
    context.beginPath();
    context.moveTo(0, i);
    context.lineTo(canvas.width, i);
    context.stroke();
  }
  
  // 修复: 使用已导入的 CanvasTexture，而不是 THREE.CanvasTexture
  const texture = new CanvasTexture(canvas);
  // 修复: 使用已导入的 RepeatWrapping，而不是 THREE.RepeatWrapping
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(10, 10);
  
  return texture;
}
