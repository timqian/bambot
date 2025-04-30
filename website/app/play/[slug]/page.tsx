"use client";
import { useParams } from "next/navigation";
import { notFound } from "next/navigation";

import RobotLoader from "@/components/RobotLoader";
import { robotConfigMap } from "@/config/robotConfig";

export default function Page() {
  const params = useParams();
  const slug = params?.slug as string;

  if (!robotConfigMap[slug]) {
    notFound();
  }

  return (
    <div className="relative w-screen h-dvh">
      <RobotLoader robotName={slug} />
    </div>
  );
}
