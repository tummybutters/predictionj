import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-16">
      <SignUp />
    </main>
  );
}
