import { source } from "@/lib/source";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import { notFound } from "next/navigation";
import { getMDXComponents } from "@/components/mdx";
import type { Metadata } from "next";
import { createRelativeLink } from "fumadocs-ui/mdx";

export default async function Page(props: PageProps<"/docs/[[...slug]]">) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      tableOfContent={{
        style: "clerk",
      }}
      tableOfContentPopover={{
        style: "clerk",
      }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: PageProps<"/docs/[[...slug]]">): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const slug = Array.isArray(params.slug) ? params.slug.join("/") : params.slug;

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      type: "article",
      publishedTime: new Date().toISOString(),
      modifiedTime: new Date().toISOString(),
      authors: ["Talak Web3"],
      title: `${page.data.title} | Talak Web3`,
      description: page.data.description,
      url: `https://talak-web3.com/docs/${slug}`,
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${page.data.title} | Talak Web3`,
      description: page.data.description,
      images: ["/og-image.png"],
    },
    alternates: {
      canonical: `https://talak-web3.com/docs/${slug}`,
    },
  };
}
