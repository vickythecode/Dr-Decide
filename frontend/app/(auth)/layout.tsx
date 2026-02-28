export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen auth-bg p-4 md:p-8">
      <div className="mx-auto max-w-[720px]">
        <div className="mb-5 text-center">
          <p className="title text-3xl">Dr. Decide</p>
          <p className="muted text-sm">Secure role-based access for patient, doctor, and receptionist workflows.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
