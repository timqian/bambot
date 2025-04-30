export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}) {
  return {
    title: `Play with ${params.slug}`,
    description: `${params.slug} simulation and control`,
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
