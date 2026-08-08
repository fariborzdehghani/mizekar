"use client";

export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body
        style={{
          alignItems: "center",
          background: "#f8f9fc",
          color: "#101828",
          display: "flex",
          fontFamily: "sans-serif",
          justifyContent: "center",
          margin: 0,
          minHeight: "100vh",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <main>
          <h1>برنامه با خطای غیرمنتظره روبه‌رو شد</h1>
          <p>لطفاً دوباره تلاش کنید.</p>
          <button
            type="button"
            onClick={unstable_retry}
            style={{
              background: "#625cff",
              border: 0,
              borderRadius: "12px",
              color: "white",
              cursor: "pointer",
              minHeight: "44px",
              padding: "0 20px",
            }}
          >
            تلاش دوباره
          </button>
        </main>
      </body>
    </html>
  );
}
