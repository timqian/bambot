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

let scene, camera, renderer, robot, controls;
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
    metalness: 0.5,
    roughness: 0.2,
    reflectivity: 0.5,
    clearcoat: 0.3,
    side: DoubleSide,
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

  // 添加模型切换功能
  const modelSelect = document.getElementById('modelSelect');
  modelSelect.addEventListener('change', (e) => {
    const selectedModel = e.target.value;
    if (robot) {
      scene.remove(robot);
    }
    
    // 加载选中的模型
    const manager = new LoadingManager();
    const loader = new URDFLoader(manager);
    loader.load(`/URDF/${selectedModel}.urdf`, result => {
      robot = result;
    });

    // 等待模型加载完成
    manager.onLoad = () => {
      robot.rotation.x = - Math.PI / 2;
      robot.rotation.z = - Math.PI;
      robot.traverse(c => {
        c.castShadow = true;
      });

      console.log(robot.joints);
      robot.updateMatrixWorld(true);

      const bb = new Box3();
      bb.setFromObject(robot);

      robot.scale.set(15, 15, 15);
      robot.position.y -= bb.min.y;
      scene.add(robot);

      // Initialize keyboard controls for the new model
      keyboardUpdate = setupKeyboardControls(robot);
    };
  });

  // 初始加载默认模型
  const manager = new LoadingManager();
  const loader = new URDFLoader(manager);
  loader.load('/URDF/so_arm100.urdf', result => {
    robot = result;
  });

  // wait until all the geometry has loaded to add the model to the scene
  manager.onLoad = () => {
      robot.rotation.x = - Math.PI / 2;
      robot.rotation.z = - Math.PI;
      robot.traverse(c => {
          c.castShadow = true;
      });
      // for (let i = 1; i <= 6; i++) {
      //     robot.joints[`HP${ i }`].setJointValue(MathUtils.degToRad(30));
      //     robot.joints[`KP${ i }`].setJointValue(MathUtils.degToRad(120));
      //     robot.joints[`AP${ i }`].setJointValue(MathUtils.degToRad(-60));
      // }

      console.log(robot.joints);
      // robot.joints["Elbow"].setJointValue(3);
      robot.updateMatrixWorld(true);

      const bb = new Box3();
      bb.setFromObject(robot);

      robot.scale.set(15, 15, 15);
      robot.position.y -= bb.min.y;
      scene.add(robot);

      // Initialize keyboard controls
      keyboardUpdate = setupKeyboardControls(robot);
  };

  onResize();
  window.addEventListener('resize', onResize);

  // Setup UI for control panel
  setupControlPanel();
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
  if (keyboardUpdate) keyboardUpdate();
  
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
