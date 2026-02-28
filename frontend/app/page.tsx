import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--bg)] p-4 md:p-8">
      <div className="mx-auto grid max-w-[1200px] gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="home-hero panel p-6 md:p-8">
          <p className="pill inline-block">Smart Care Coordination</p>
          <h1 className="title mt-4 text-4xl leading-tight md:text-5xl">
            Dr. Decide
            <br />
            Unified Hospital Workflow
          </h1>
          <p className="muted mt-4 max-w-[560px] text-base">
            Connect patients, doctors, and reception staff in one portal for appointments, care plans, queue handling,
            and consultation updates.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="btn btn-primary" href="/auth/login">
              Sign In
            </Link>
            <Link className="btn btn-secondary" href="/auth/signup">
              Create Account
            </Link>
          </div>
        </section>

        <section className="panel p-6 md:p-8">
          <h2 className="section-title text-xl">Portal Access</h2>
          <div className="mt-4 space-y-3">
            <Link href="/auth/login/patient" className="auth-role-card">
              <p className="title text-lg">Patient</p>
              <p className="muted text-sm">Book appointments, follow care plans, and read summarization.</p>
            </Link>
            <Link href="/auth/login/doctor" className="auth-role-card">
              <p className="title text-lg">Doctor</p>
              <p className="muted text-sm">Manage schedule, consult patients, and track adherence.</p>
            </Link>
            <Link href="/auth/login/receptionist" className="auth-role-card">
              <p className="title text-lg">Receptionist</p>
              <p className="muted text-sm">Monitor queue and generate walk-in tokens.</p>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
