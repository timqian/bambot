import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Feetech Servo Control Panel - feetech.js',
  description: 'Config and debug your Feetech servos with ease using feetech.js, a JavaScript library for controlling Feetech servo motors. Test and control SCS/STS series servos directly in your browser.',
  keywords: ['Feetech servo', 'SCS servo', 'STS servo', 'JavaScript', 'feetech.js', 'servo control', 'robotics'],
  openGraph: {
    title: 'Feetech Servo Control Panel - feetech.js',
    description: 'Config and debug your Feetech servos with ease using feetech.js, a JavaScript library for controlling Feetech servo motors. Test and control SCS/STS series servos directly in your browser.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Feetech Servo Control Panel - feetech.js',
    description: 'Config and debug your Feetech servos with ease using feetech.js, a JavaScript library for controlling Feetech servo motors. Test and control SCS/STS series servos directly in your browser.',
  },
};

export default function FeetechLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
