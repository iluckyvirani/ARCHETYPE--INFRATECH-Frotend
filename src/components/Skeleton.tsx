type SkeletonProps = {
  className?: string;
  style?: React.CSSProperties;
};

export function Skeleton({ className = "", style }: SkeletonProps) {
  return <div className={`skeleton ${className}`.trim()} style={style} aria-hidden />;
}

export function ClientCardSkeleton() {
  return (
    <div className="list-item client-card skeleton-card" aria-hidden>
      <div className="client-card-main" style={{ pointerEvents: "none" }}>
        <div style={{ flex: 1 }}>
          <Skeleton style={{ height: 22, width: "42%", marginBottom: 10 }} />
          <Skeleton style={{ height: 14, width: "68%", marginBottom: 8 }} />
          <Skeleton style={{ height: 12, width: "48%" }} />
        </div>
        <div className="client-card-amounts" style={{ alignItems: "flex-end" }}>
          <Skeleton style={{ height: 28, width: 110, borderRadius: 999 }} />
          <Skeleton style={{ height: 12, width: 72, marginTop: 8 }} />
        </div>
      </div>
      <div className="client-card-actions">
        <Skeleton style={{ height: 40, flex: 1, borderRadius: 999 }} />
        <Skeleton style={{ height: 40, flex: 1, borderRadius: 999 }} />
        <Skeleton style={{ height: 40, flex: 1, borderRadius: 999 }} />
      </div>
    </div>
  );
}

export function ClientsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <section className="panel" aria-busy="true" aria-label="Loading clients">
      <div className="list">
        {Array.from({ length: count }, (_, i) => (
          <ClientCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

export function AlertCardSkeleton() {
  return (
    <div className="list-item skeleton-card" aria-hidden>
      <div style={{ flex: 1 }}>
        <Skeleton style={{ height: 20, width: "55%", marginBottom: 10 }} />
        <Skeleton style={{ height: 14, width: "78%", marginBottom: 8 }} />
        <Skeleton style={{ height: 12, width: "40%" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
        <Skeleton style={{ height: 24, width: 90, borderRadius: 999 }} />
        <Skeleton style={{ height: 36, width: 88, borderRadius: 999 }} />
      </div>
    </div>
  );
}

export function AlertsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <section className="panel" aria-busy="true" aria-label="Loading alerts">
      <Skeleton style={{ height: 18, width: 120, marginBottom: 16 }} />
      <div className="list">
        {Array.from({ length: count }, (_, i) => (
          <AlertCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

export function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading client">
      <header className="page-header">
        <div style={{ flex: 1 }}>
          <Skeleton style={{ height: 28, width: "46%", marginBottom: 10 }} />
          <Skeleton style={{ height: 14, width: "32%" }} />
        </div>
        <div className="row-actions" style={{ gap: 8 }}>
          <Skeleton style={{ height: 40, width: 100, borderRadius: 999 }} />
          <Skeleton style={{ height: 40, width: 72, borderRadius: 999 }} />
          <Skeleton style={{ height: 40, width: 72, borderRadius: 999 }} />
        </div>
      </header>
      <section className="panel">
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} style={{ height: 36, width: 88, borderRadius: 999 }} />
          ))}
        </div>
        <div className="form-grid two">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i}>
              <Skeleton style={{ height: 12, width: "40%", marginBottom: 8 }} />
              <Skeleton style={{ height: 18, width: "70%" }} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <section className="panel" aria-busy="true" aria-label="Loading form">
      <Skeleton style={{ height: 24, width: "40%", marginBottom: 20 }} />
      <div className="form-grid two">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} style={{ gridColumn: i === 0 || i === 1 ? undefined : undefined }}>
            <Skeleton style={{ height: 12, width: "45%", marginBottom: 8 }} />
            <Skeleton style={{ height: 44, width: "100%", borderRadius: 8 }} />
          </div>
        ))}
      </div>
      <Skeleton style={{ height: 48, width: "100%", borderRadius: 999, marginTop: 24 }} />
    </section>
  );
}
