"use client";

export default function DebugClickPage() {
  return (
    <div style={{ padding: 40 }}>
      <h1>Debug Click Page</h1>
      <button
        type="button"
        onClick={() => alert("Click works")}
        style={{
          padding: 20,
          background: "red",
          color: "white",
          borderRadius: 8,
        }}
      >
        Test Click
      </button>
    </div>
  );
}
