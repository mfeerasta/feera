import Link from 'next/link';
import { adminFetch } from '@/lib/admin/api-client';
import { gateAdmin } from '@/lib/admin/gate';
import { ProjectTabs } from './project-tabs';
import type { ProjectData } from './project-tabs';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ admin?: string }>;
}

export default async function CourtsProjectDetailPage({
  params,
  searchParams,
}: PageProps) {
  const [sp, { slug }] = await Promise.all([searchParams, params]);
  gateAdmin(sp);

  const res = await adminFetch(`/api/v1/courts/projects/${slug}`);

  if (!res.ok) {
    return (
      <section className="mx-auto max-w-5xl">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
            Courts / Projects
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight">
            Project not found
          </h1>
          <p className="mt-4 text-sm text-ink-deep/60">
            Could not load project data (HTTP {res.status}).
          </p>
          <Link
            href="/admin/courts/projects"
            className="mt-4 inline-block text-sm text-court hover:text-court/80"
          >
            Back to projects
          </Link>
        </div>
      </section>
    );
  }

  const json = (await res.json()) as { data: ProjectData };
  const project = json.data;

  return (
    <section className="mx-auto max-w-[1400px]">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
          <Link
            href="/admin/courts/projects"
            className="hover:text-court"
          >
            Courts / Projects
          </Link>
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">
          {project.projectName}
        </h1>
        {project.city && (
          <p className="mt-1 text-sm text-ink-deep/60">
            {project.city}
            {project.region ? `, ${project.region}` : ''}
            {project.country ? `, ${project.country}` : ''}
          </p>
        )}
      </div>

      <ProjectTabs project={project} />
    </section>
  );
}
