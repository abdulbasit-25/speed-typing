import { useState } from "react";

const ARCHER_URL = "https://abdulbasit-archer.vercel.app/";
const ARCHER_LOGO = "https://abdulbasit-archer.vercel.app/logo.png";

export function PoweredByArcher() {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <div className="powered-by-archer">
      <a
        href={ARCHER_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Powered by Archer (opens in a new tab)"
        className="powered-by-link"
      >
        <span className="archer-mark" aria-hidden="true">
          <span className="archer-ring archer-ring-outer" />
          <span className="archer-ring archer-ring-inner" />
          <span className="archer-logo">
            {logoFailed ? (
              <span className="archer-fallback">A</span>
            ) : (
              <img
                src={ARCHER_LOGO}
                alt=""
                width={64}
                height={64}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => setLogoFailed(true)}
              />
            )}
          </span>
        </span>
        <span className="powered-by-copy">
          <span>POWERED BY</span>
          <strong>ARCHER <span aria-hidden="true">↗</span></strong>
        </span>
      </a>
    </div>
  );
}
