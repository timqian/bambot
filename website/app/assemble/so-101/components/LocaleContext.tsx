"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  Dispatch,
  SetStateAction,
} from "react";

const translations = {
  en: {
    // page.tsx
    source: "Source the parts",
    assembly: "Assemble",
    configure: "Configure Motors",
    calibrate: "Calibrate",
    openNavigation: "Open Navigation",
    steps: "Steps",
    assembleTitle: "Assemble SO-101",
    assembleDescription:
      "Assemble and calibrate your SO-101 (SO-ARM100) without leaving the browser.",
    // SourceParts.tsx
    sourceTheParts: "Source the parts",
    sourceReadme:
      "which contains the bill of materials, sourcing links, and 3D printing instructions.",
    followThe: "Follow the",
    // AssemblyInstructions.tsx
    stepByStep: "Follow the step-by-step assembly instructions on the",
    lerobotDocumentation: "LeRobot documentation",
    // ConfigureMotors.tsx
    configureTheMotors: "Configure the motors",
    connectToMotorBus: "Connect to the Motor Bus",
    connectPrompt:
      "Click the button below to connect to the motor bus via Web Serial. Your browser will prompt you to select a serial port.",
    connected: "Connected",
    connect: "Connect",
    setupFollowerMotors: "Setup Follower Motors",
    setupFollowerMotorsDesc:
      "Connect each motor individually, select it from the list, and set its ID. The default ID for a new motor is 1.",
    selectMotorToConfigure: "Select a motor to configure",
    setMotorId: "Set Motor ID",
    fromId: "From ID",
    toId: "To ID",
    setIdFor: "Set ID for",
    motorIdUncertain: "Not sure about the current motor ID?",
    scanForMotorsDesc: "Scan a range of IDs to find connected motors.",
    scanForMotors: "Scan for motors",
    scanning: "Scanning...",
    scanResults: "Scan Results:",
    position: "Position",
    notFound: "Not found",
    disconnectFromMotorBus: "Disconnect from motor bus",
    disconnectDesc:
      "Once you have configured all motors, you can disconnect from the motor bus.",
    disconnect: "Disconnect",
    // Calibrate.tsx
    calibrationDesc:
      "Calibration ensures different arms have matching position values for the same physical positions. This is crucial for neural networks trained on one robot to work on another.",
    connectToMotorBusCalibrate: "Connect to Motor Bus",
    connectToMotorBusCalibrateDesc:
      "Once your motors are connected together, you can link the motor bus to this page using web serial. (Ensure you have disconnected from any previous connections before proceeding.)",
    calibrateButton: "Calibrate",
    calibrateDesc:
      "Move the robot to the middle position as displayed in the preview, and click calibrate.",
    setMotorPositionLimits: "Set Motor Position Limits",
    setMotorPositionLimitsDesc:
      "Click start, then move each joint of the robot to its minimum and maximum positions. Once done, click stop to save the limits.",
    jointId: "Joint ID",
    min: "Min",
    current: "Current",
    max: "Max",
    start: "Start",
    finding: "Finding...",
    setLimits: "Set limits",
    calibrationResult: "Calibration result",
    downloadJson: "Download json",
    calibrationResultDesc:
      "Here is the calibration file for your robot. It is LeRobot compatible.",
    congratulations: "🎉 Congratulations!",
    congratulationsDesc:
      "You have successfully assembled and calibrated it.",
    goToControlPage: "Play with your robot",
  },
  zh: {
    // page.tsx
    source: "采购零件",
    assembly: "组装",
    configure: "配置电机",
    calibrate: "校准",
    openNavigation: "打开导航",
    steps: "步骤",
    assembleTitle: "组装 SO-101",
    assembleDescription: "在浏览器中组装和校准您的 SO-101 (SO-ARM100)。",
    // SourceParts.tsx
    sourceTheParts: "采购零件",
    sourceReadme: "其中包含物料清单、采购链接和3D打印说明。",
    followThe: "请遵循",
    // AssemblyInstructions.tsx
    stepByStep: "请遵循",
    lerobotDocumentation: "LeRobot文档中的分步组装说明",
    // ConfigureMotors.tsx
    configureTheMotors: "配置电机",
    connectToMotorBus: "连接到电机总线",
    connectPrompt:
      "点击下面的按钮通过Web Serial连接到电机总线。您的浏览器会提示您选择一个串口。",
    connected: "已连接",
    connect: "连接",
    setupFollowerMotors: "设置从动电机",
    setupFollowerMotorsDesc:
      "单独连接每个电机，从列表中选择它，并设置其ID。新电机的默认ID为1。",
    selectMotorToConfigure: "选择要配置的电机",
    setMotorId: "设置电机ID",
    fromId: "从ID",
    toId: "到ID",
    setIdFor: "设置ID",
    motorIdUncertain: "不确定当前电机ID？",
    scanForMotorsDesc: "扫描ID范围以查找连接的电机。",
    scanForMotors: "扫描电机",
    scanning: "扫描中...",
    scanResults: "扫描结果:",
    position: "位置",
    notFound: "未找到",
    disconnectFromMotorBus: "断开与电机总线的连接",
    disconnectDesc: "配置完所有电机后，您可以断开与电机总线的连接。",
    disconnect: "断开连接",
    // Calibrate.tsx
    calibrationDesc:
      "校准可确保不同的机械臂对于相同的物理位置具有匹配的位置值。这对于在一个机器人上训练的神经网络在另一个机器人上工作至关重要。",
    connectToMotorBusCalibrate: "连接到电机总线",
    connectToMotorBusCalibrateDesc:
      "将电机连接在一起后，您可以使用Web Serial将电机总线链接到此页面。（在继续之前，请确保已断开任何先前的连接。）",
    calibrateButton: "校准",
    calibrateDesc: "将机器人移动到预览中显示的中间位置，然后单击校准。",
    setMotorPositionLimits: "设置电机位置限制",
    setMotorPositionLimitsDesc:
      "单击开始，然后将机器人的每个关节移动到其最小和最大位置。完成后，单击停止以保存限制。",
    jointId: "关节ID",
    min: "最小",
    current: "当前",
    max: "最大",
    start: "开始",
    finding: "寻找中...",
    setLimits: "设置限制",
    calibrationResult: "校准结果",
    downloadJson: "下载json",
    calibrationResultDesc: "这是您的机器人的校准文件。它与LeRobot兼容。",
    congratulations: "🎉 恭喜！",
    congratulationsDesc:
      "您的机器人组装和校准成功！",
    goToControlPage: "控制您的机器人",
  },
};

type Locale = "en" | "zh";
type Translations = typeof translations.en;

interface LocaleContextType {
  locale: Locale;
  setLocale: Dispatch<SetStateAction<Locale>>;
  t: Translations;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: [Locale, Dispatch<SetStateAction<Locale>>];
}) {
  const [locale, setLocale] = value;
  const t = translations[locale];

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}
