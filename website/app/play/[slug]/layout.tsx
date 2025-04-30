export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = await Promise.resolve(params); // 确保 params 是异步的
  return {
    title: `Play with ${slug}`,
    description: `${slug} simulation and control`,
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
