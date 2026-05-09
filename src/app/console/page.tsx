import { headers } from "next/headers";
import { parseJwtPayload, type JwtPayload } from "@/lib/jwt";

export const dynamic = "force-dynamic";

function formatUnixTime(ts: number): string {
    return new Date(ts * 1000).toISOString().replace("T", " ").replace(".000Z", " UTC");
}

function Field({ label, value }: { label: string; value: string | undefined | null }) {
    return (
        <tr className="border-b border-gray-100 last:border-0">
            <td className="py-2 pr-6 text-sm font-medium text-gray-500 whitespace-nowrap align-top">{label}</td>
            <td className="py-2 text-sm text-gray-900 break-all font-mono">
                {value ?? <span className="text-gray-400 italic">—</span>}
            </td>
        </tr>
    );
}

export default async function ConsolePage() {
    const headerMap = await headers();

    const jwtToken = headerMap.get("cf-access-jwt-assertion");
    const directEmail = headerMap.get("cf-access-authenticated-user-email");

    const payload = jwtToken ? parseJwtPayload(jwtToken) : null;

    const isProtected = jwtToken !== null || directEmail !== null;

    // Extract "other" claims (all fields beyond the known ones)
    const knownKeys = new Set(["email", "sub", "aud", "iss", "iat", "exp", "name", "groups", "country"]);
    const otherClaims: Record<string, unknown> = {};
    if (payload) {
        for (const [k, v] of Object.entries(payload)) {
            if (!knownKeys.has(k)) otherClaims[k] = v;
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-3xl mx-auto space-y-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Portal — Cloudflare Access 验证信息</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        此页面仅用于验证 Cloudflare Access 保护流程是否正常工作。
                    </p>
                </div>

                {!isProtected && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        <strong>本地开发环境</strong> — 未检测到 Cloudflare Access 请求头（
                        <code className="font-mono">Cf-Access-Jwt-Assertion</code> 和{" "}
                        <code className="font-mono">Cf-Access-Authenticated-User-Email</code>{" "}
                        均为空）。部署到 Cloudflare 并通过 Access 策略访问后，此处将显示完整认证信息。
                    </div>
                )}

                {/* Section A: Direct header */}
                <section className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                            直接 Header
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Cloudflare Access 直接注入，无需解码
                        </p>
                    </div>
                    <div className="px-5 py-4">
                        <table className="w-full">
                            <tbody>
                                <Field
                                    label="Cf-Access-Authenticated-User-Email"
                                    value={directEmail}
                                />
                                <Field
                                    label="Cf-Access-Jwt-Assertion"
                                    value={jwtToken ? `${jwtToken.slice(0, 60)}…` : null}
                                />
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Section B: JWT decoded claims */}
                <section className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                            JWT Claims（解码后）
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                            从 <code className="font-mono">Cf-Access-Jwt-Assertion</code> Base64URL 解码（未验证签名）
                        </p>
                    </div>

                    {!payload && (
                        <div className="px-5 py-4 text-sm text-gray-400 italic">
                            {jwtToken ? "JWT 解码失败，格式异常。" : "无 JWT Token。"}
                        </div>
                    )}

                    {payload && (
                        <div className="divide-y divide-gray-100">
                            {/* Core identity fields */}
                            <div className="px-5 py-4">
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-3">身份信息</p>
                                <table className="w-full">
                                    <tbody>
                                        <Field label="email" value={payload.email} />
                                        <Field label="sub" value={payload.sub} />
                                        <Field label="name" value={payload.name} />
                                        <Field
                                            label="groups"
                                            value={
                                                payload.groups && payload.groups.length > 0
                                                    ? payload.groups.join(", ")
                                                    : undefined
                                            }
                                        />
                                        <Field label="country" value={payload.country} />
                                    </tbody>
                                </table>
                            </div>

                            {/* Token metadata */}
                            <div className="px-5 py-4">
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Token 元数据</p>
                                <table className="w-full">
                                    <tbody>
                                        <Field
                                            label="iss"
                                            value={payload.iss}
                                        />
                                        <Field
                                            label="aud"
                                            value={
                                                Array.isArray(payload.aud)
                                                    ? payload.aud.join(", ")
                                                    : payload.aud
                                            }
                                        />
                                        <Field
                                            label="iat"
                                            value={payload.iat ? formatUnixTime(payload.iat) : undefined}
                                        />
                                        <Field
                                            label="exp"
                                            value={payload.exp ? formatUnixTime(payload.exp) : undefined}
                                        />
                                    </tbody>
                                </table>
                            </div>

                            {/* Other claims */}
                            {Object.keys(otherClaims).length > 0 && (
                                <div className="px-5 py-4">
                                    <p className="text-xs font-semibold text-gray-400 uppercase mb-3">其他 Claims</p>
                                    <table className="w-full">
                                        <tbody>
                                            {Object.entries(otherClaims).map(([k, v]) => (
                                                <Field
                                                    key={k}
                                                    label={k}
                                                    value={typeof v === "object" ? JSON.stringify(v) : String(v)}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Raw payload */}
                            <div className="px-5 py-4">
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-3">完整 Payload（原始 JSON）</p>
                                <pre className="text-xs bg-gray-50 rounded p-3 overflow-x-auto text-gray-700 border border-gray-100">
                                    {JSON.stringify(payload, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                </section>

                {/* Consistency check */}
                {payload && directEmail && payload.email && (
                    <div
                        className={`rounded-lg border px-4 py-3 text-sm ${payload.email === directEmail
                            ? "border-green-200 bg-green-50 text-green-800"
                            : "border-red-200 bg-red-50 text-red-800"
                            }`}
                    >
                        {payload.email === directEmail ? (
                            <>
                                <strong>✓ 一致性检查通过</strong> —{" "}
                                <code className="font-mono">Cf-Access-Authenticated-User-Email</code> 与 JWT{" "}
                                <code className="font-mono">email</code> claim 相同。
                            </>
                        ) : (
                            <>
                                <strong>✗ 一致性检查失败</strong> — Header 邮箱（
                                <code className="font-mono">{directEmail}</code>）与 JWT email claim（
                                <code className="font-mono">{payload.email}</code>）不匹配，请检查配置。
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
