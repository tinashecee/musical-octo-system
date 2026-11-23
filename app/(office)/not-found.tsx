import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16">
      <h1 className="font-serif text-4xl">That page is not here</h1>
      <p className="mt-3 text-muted">The quotation or invoice may have been deleted.</p>
      <Link href="/" className="btn-primary mt-6 inline-flex">
        Back to the dashboard
      </Link>
    </div>
  );
}
