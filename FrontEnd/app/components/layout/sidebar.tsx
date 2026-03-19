import Image from "next/image";

export default function Sidebar() {
  return (
    <aside className="w-72 border-r border-orange-100 bg-white/95 p-5">
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-xl bg-orange-100 p-2">
          <Image src="/logos/logo.svg" alt="Logo" width={40} height={40} />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-stone-900">RHpro</h2>
          <p className="text-xs text-stone-500">Attendance Workflow</p>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-orange-100 bg-orange-50 px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-orange-700">Workspace</p>
        <p className="mt-0.5 text-xs text-stone-600">Core Operations</p>
      </div>

      <nav className="space-y-2">
        <a className="block rounded-lg border border-orange-200 bg-orange-100 px-3 py-2.5 text-sm font-medium text-orange-800">
          Dashboard
        </a>
        <a className="block rounded-lg px-3 py-2.5 text-sm text-stone-700 transition hover:bg-orange-50 hover:text-orange-700">
          Timesheets
        </a>
        <a className="block rounded-lg px-3 py-2.5 text-sm text-stone-700 transition hover:bg-orange-50 hover:text-orange-700">
          Requests
        </a>
        <a className="block rounded-lg px-3 py-2.5 text-sm text-stone-700 transition hover:bg-orange-50 hover:text-orange-700">
          Projects
        </a>
        <a className="block rounded-lg px-3 py-2.5 text-sm text-stone-700 transition hover:bg-orange-50 hover:text-orange-700">
          Employee Files
        </a>
        <a className="block rounded-lg px-3 py-2.5 text-sm text-stone-700 transition hover:bg-orange-50 hover:text-orange-700">
          Notifications
        </a>
      </nav>
    </aside>
  );
}
