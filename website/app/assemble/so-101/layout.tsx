import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Assemble so-101 arm',
  description: 'Assemble and calibrate your so-101 robotic arm with ease. This page allows you to assemble the so-101 arm without leaving your browser',
};

export default function FeetechLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
