import { whopSdk } from "@/lib/whop-sdk";
import { headers } from "next/headers";
import { CreatorDashboardClient } from "./CreatorDashboardClient";

export default async function DashboardPage({
	params,
}: {
	params: Promise<{ companyId: string }>;
}) {
	try {
		// The headers contains the user token
		const headersList = await headers();

		// The companyId is a path param
		const { companyId } = await params;

		// The user token is in the headers
		const { userId } = await whopSdk.verifyUserToken(headersList);

		const result = await whopSdk.access.checkIfUserHasAccessToCompany({
			userId,
			companyId,
		});

		const user = await whopSdk.users.getUser({ userId });
		const company = await whopSdk.companies.getCompany({ companyId });

		// Either: 'admin' | 'no_access';
		// 'admin' means the user is an admin of the company, such as an owner or moderator
		// 'no_access' means the user is not an authorized member of the company
		const { accessLevel } = result;

		if (!result.hasAccess) {
			return (
				<div className="flex justify-center items-center h-screen px-8">
					<h1 className="text-xl text-zinc-100">
						Hi <strong>{user.name}</strong>, you do not have access to this company dashboard.
					</h1>
				</div>
			);
		}

		return (
			<div className="min-h-screen bg-zinc-900 text-zinc-100">
				<div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
					<div>
						<h1 className="text-2xl font-semibold text-emerald-100">Creator Dashboard</h1>
						<p className="text-sm text-emerald-100/75">
							{company.title} - access level: {accessLevel}
						</p>
					</div>
					<CreatorDashboardClient />
				</div>
			</div>
		);
	} catch (error) {
		console.error("Dashboard auth/context error:", error);
		return (
			<div className="min-h-screen bg-zinc-900 text-zinc-100 flex items-center justify-center px-6">
				<div className="max-w-xl rounded-xl border border-emerald-300/30 bg-zinc-900/70 p-6 text-center">
					<h1 className="text-xl font-semibold text-emerald-100">Open this from Whop dashboard</h1>
					<p className="mt-3 text-sm text-emerald-100/75">
						This page needs Whop creator dashboard context. Open the app from your Whop admin/dashboard area
						or use the in-app creator shortcut button.
					</p>
				</div>
			</div>
		);
	}
}
