const form =
  document.getElementById(
    "research-form",
  );

const question =
  document.getElementById(
    "question",
  );

const runButton =
  document.getElementById(
    "run-button",
  );

const output =
  document.getElementById(
    "agent-output",
  );

const auditBody =
  document.getElementById(
    "audit-body",
  );


function formatUsdc(
  baseUnits,
) {
  return (
    Number(baseUnits) /
    1_000_000
  ).toFixed(6);
}


function shortHash(
  hash,
) {
  if (!hash) {
    return "—";
  }

  if (hash.length <= 18) {
    return hash;
  }

  return (
    hash.slice(0, 10) +
    "…" +
    hash.slice(-8)
  );
}


function formatReason(
  reason,
) {
  if (!reason) {
    return "";
  }

  return reason
    .replace(
      "quote exceeds the per-call spending limit",
      "Per-call limit exceeded",
    )
    .replace(
      "quote exceeds the remaining run budget",
      "Remaining budget exceeded",
    );
}


async function refreshState() {
  const response =
    await fetch(
      "/api/state",
    );

  const state =
    await response.json();


  const spent =
    BigInt(
      state.purse.spentBaseUnits,
    );

  const remaining =
    BigInt(
      state.purse.remainingBaseUnits,
    );

  const budget =
    BigInt(
      state.policy.runBudgetBaseUnits,
    );

  const perCall =
    BigInt(
      state.policy.perCallLimitBaseUnits,
    );


  document.getElementById(
    "spent",
  ).textContent =
    "$" +
    formatUsdc(spent);


  document.getElementById(
    "remaining",
  ).textContent =
    "$" +
    formatUsdc(remaining) +
    " remaining";


  document.getElementById(
    "budget",
  ).textContent =
    "$" +
    formatUsdc(budget);


  document.getElementById(
    "per-call",
  ).textContent =
    "$" +
    formatUsdc(perCall);


  renderAudit(
    state.decisions,
  );
}


function renderAudit(
  decisions,
) {
  if (
    !decisions ||
    decisions.length === 0
  ) {
    auditBody.innerHTML = `
      <tr>
        <td
          colspan="6"
          class="empty"
        >
          No payment decisions yet.
        </td>
      </tr>
    `;

    return;
  }


  auditBody.innerHTML =
    decisions
      .slice()
      .reverse()
      .map(
        (decision) => {

          const paid =
            decision.decision ===
            "paid";

          const time =
            new Date(
              decision.timestamp,
            ).toLocaleTimeString();


          return `
            <tr>

              <td>
                ${time}
              </td>

              <td>
                ${decision.seller}
              </td>

              <td>
                $${formatUsdc(
                  decision.amount_base_units,
                )}
              </td>

              <td class="${
                paid
                  ? "audit-paid"
                  : "audit-refused"
              }">

                ${
                  paid
                    ? "PAID"
                    : "REFUSED"
                }

              </td>

              <td>
                ${formatReason(
                  decision.reason,
                )}
              </td>

              <td class="tx">
                ${
                  shortHash(
                    decision.tx_hash,
                  )
                }
              </td>

            </tr>
          `;
        },
      )
      .join("");
}


form.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    const value =
      question.value.trim();

    if (!value) {
      return;
    }


    runButton.disabled = true;

    runButton.textContent =
      "Running…";


    output.classList.remove(
      "hidden",
    );

    output.textContent =
      "Agent is researching…";


    try {

      const response =
        await fetch(
          "/api/run",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              question: value,
            }),
          },
        );


      const result =
        await response.json();


      if (!response.ok) {
        throw new Error(
          result.error ||
          "Agent request failed",
        );
      }


      const lines = [];

      lines.push(
        result.summary,
      );

      lines.push("");


      for (
        const source of
        result.sources
      ) {

        if (
          source.status ===
          "paid"
        ) {

          lines.push(
            `✓ ${source.seller} — ` +
            `$${formatUsdc(
              source.amountBaseUnits ||
              "0",
            )} paid`,
          );

        } else {

          lines.push(
            `× ${source.seller} — ` +
            `REFUSED`,
          );

          if (source.reason) {
            lines.push(
              `  ${formatReason(
                source.reason,
              )}`,
            );
          }
        }
      }


      output.textContent =
        lines.join("\n");


      await refreshState();

    } catch (error) {

      output.textContent =
        error instanceof Error
          ? error.message
          : String(error);

    } finally {

      runButton.disabled =
        false;

      runButton.textContent =
        "Run Agent";

    }
  },
);


refreshState();


setInterval(
  refreshState,
  2000,
);