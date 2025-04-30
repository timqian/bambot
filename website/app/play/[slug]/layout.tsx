export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}) {
  const slug = params.slug as string;
  return {
    title: `Play with ${slug}`,
    description: `${slug} simulation and control`,
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
