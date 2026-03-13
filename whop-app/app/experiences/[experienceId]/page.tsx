import { redirect } from 'next/navigation';

export default async function ExperiencePage({
	params,
}: {
	params: Promise<{ experienceId: string }>;
}) {
	const { experienceId } = await params;
	redirect(`/journal?experienceId=${encodeURIComponent(experienceId)}`);
}
