import type { LangKey } from "@/lib/language";

interface PrivacySection {
    heading: string;
    body: string;
}

export interface PrivacyContent {
    title: string;
    lastUpdated: string;
    intro: string;
    sections: PrivacySection[];
}

export const privacyContent: Record<LangKey, PrivacyContent> = {
    en: {
        title: "Privacy Policy",
        lastUpdated: "Last updated: April 20, 2026",
        intro:
            "Huable (huable.xyz) is a collection of free, browser-based utilities. Your privacy matters to us. This policy applies to huable.xyz and all *.huable.xyz subdomains. It explains what — if anything — is stored or processed when you use our site.",
        sections: [
            {
                heading: "Data We Do Not Collect",
                body: "We do not collect, store, or process any personal data on our servers. Our tools run entirely in your browser. No account registration is required. We do not use analytics trackers, fingerprinting scripts, or advertising networks.",
            },
            {
                heading: "Browser Storage (localStorage)",
                body: "BaseX, HashX, CryptoX, and WeJSON use your browser's localStorage to save recent operation history — for example, your last 10 hash results. All tools also store your language preference as a functionally necessary setting; this does not require consent and contains no personal data. All locally stored data lives entirely on your device and is never transmitted to us. You can clear it at any time via your browser's settings or developer tools.",
            },
            {
                heading: "Cookies",
                body: "This site does not set tracking or advertising cookies. When you respond to the cookie consent notice, a cookie named cookie-consent is stored with Domain=.huable.xyz so that all Huable tool subdomains can read your preference without asking again. This cookie contains only your accept or decline choice and expires after one year. Our hosting infrastructure (Cloudflare) may also set minimal technical cookies for security and performance (e.g., DDoS protection). These are strictly necessary and do not contain personal information.",
            },
            {
                heading: "Tool Subdomains",
                body: "Each tool runs on its own subdomain (e.g., basex.huable.xyz, hashx.huable.xyz). When you click \"Launch Tool\", you navigate to a separate web application. All Huable tools follow the same privacy principles described here.",
            },
            {
                heading: "Your Rights (GDPR / ePrivacy)",
                body: "If you are in the European Economic Area (EEA), you have rights under the GDPR and ePrivacy Directive, including the right to access, correct, or erase data held about you. Because we do not collect personal data, there is typically nothing to access or erase. For any privacy concerns, please contact us.",
            },
            {
                heading: "Changes to This Policy",
                body: "We may update this policy from time to time. Any changes will be reflected on this page with an updated date at the top.",
            },
            {
                heading: "Contact",
                body: "If you have questions about this privacy policy, please contact us at: privacy@huable.xyz",
            },
        ],
    },
    es: {
        title: "Política de privacidad",
        lastUpdated: "Última actualización: 20 de abril de 2026",
        intro:
            "Huable (huable.xyz) es una colección de utilidades gratuitas basadas en el navegador. Tu privacidad es importante para nosotros. Esta política se aplica a huable.xyz y a todos los subdominios de *.huable.xyz. Explica qué se almacena o procesa cuando usas nuestro sitio.",
        sections: [
            {
                heading: "Datos que NO recopilamos",
                body: "No recopilamos, almacenamos ni procesamos ningún dato personal en nuestros servidores. Nuestras herramientas se ejecutan completamente en tu navegador. No se requiere registro de cuenta. No utilizamos rastreadores de análisis, scripts de huella digital ni redes publicitarias.",
            },
            {
                heading: "Almacenamiento del navegador (localStorage)",
                body: "BaseX, HashX, CryptoX y WeJSON usan el localStorage de tu navegador para guardar el historial reciente de operaciones, por ejemplo, tus últimos 10 resultados. Todas las herramientas también almacenan tu preferencia de idioma como ajuste funcionalmente necesario; esto no requiere consentimiento y no contiene datos personales. Todos los datos almacenados localmente residen completamente en tu dispositivo y nunca se transmiten a nosotros. Puedes borrarlos en cualquier momento desde la configuración de tu navegador.",
            },
            {
                heading: "Cookies",
                body: "Este sitio no establece cookies de seguimiento ni publicitarias. Cuando respondes al aviso de consentimiento, se almacena una cookie llamada cookie-consent con Domain=.huable.xyz para que todos los subdominios de herramientas de Huable puedan leer tu preferencia sin volver a preguntar. Esta cookie contiene únicamente tu elección de aceptar o rechazar y caduca al cabo de un año. Nuestra infraestructura de alojamiento (Cloudflare) también puede establecer cookies técnicas mínimas por motivos de seguridad y rendimiento. Estas son estrictamente necesarias y no contienen información personal.",
            },
            {
                heading: "Subdominios de herramientas",
                body: "Cada herramienta se ejecuta en su propio subdominio (p. ej., basex.huable.xyz). Al hacer clic en «Abrir herramienta», navegas a una aplicación web separada. Todas las herramientas de Huable siguen los mismos principios de privacidad descritos aquí.",
            },
            {
                heading: "Tus derechos (RGPD / ePrivacy)",
                body: "Si te encuentras en el Espacio Económico Europeo (EEE), tienes derechos bajo el RGPD y la Directiva ePrivacy, incluyendo el derecho de acceso, rectificación o supresión de tus datos. Como no recopilamos datos personales, generalmente no hay nada que acceder o suprimir. Para cualquier duda, contáctanos.",
            },
            {
                heading: "Cambios en esta política",
                body: "Podemos actualizar esta política ocasionalmente. Los cambios se reflejarán en esta página con la fecha actualizada.",
            },
            {
                heading: "Contacto",
                body: "Si tienes preguntas sobre esta política de privacidad, contáctanos en: privacy@huable.xyz",
            },
        ],
    },
    fr: {
        title: "Politique de confidentialité",
        lastUpdated: "Dernière mise à jour : 20 avril 2026",
        intro:
            "Huable (huable.xyz) est une collection d'utilitaires gratuits fonctionnant dans le navigateur. Votre vie privée compte pour nous. Cette politique s'applique à huable.xyz et à tous les sous-domaines *.huable.xyz. Elle explique ce qui est stocké ou traité lorsque vous utilisez notre site.",
        sections: [
            {
                heading: "Données que nous NE collectons PAS",
                body: "Nous ne collectons, ne stockons ni ne traitons aucune donnée personnelle sur nos serveurs. Nos outils s'exécutent entièrement dans votre navigateur. Aucune inscription n'est nécessaire. Nous n'utilisons pas de traceurs analytiques, de scripts de fingerprinting ou de réseaux publicitaires.",
            },
            {
                heading: "Stockage du navigateur (localStorage)",
                body: "BaseX, HashX, CryptoX et WeJSON utilisent le localStorage de votre navigateur pour sauvegarder l'historique récent des opérations — par exemple, vos 10 derniers résultats. Tous les outils enregistrent également votre préférence de langue comme paramètre fonctionnellement nécessaire ; cela ne requiert pas de consentement et ne contient aucune donnée personnelle. Toutes les données stockées localement restent entièrement sur votre appareil et ne nous sont jamais transmises. Vous pouvez les effacer à tout moment via les paramètres de votre navigateur.",
            },
            {
                heading: "Cookies",
                body: "Ce site ne dépose pas de cookies de suivi ou publicitaires. Lorsque vous répondez au bandeau de consentement, un cookie nommé cookie-consent est déposé avec Domain=.huable.xyz afin que tous les sous-domaines des outils Huable puissent lire votre préférence sans vous redemander. Ce cookie contient uniquement votre choix (accepter ou refuser) et expire après un an. Notre infrastructure d'hébergement (Cloudflare) peut également déposer des cookies techniques minimes à des fins de sécurité et de performance. Ceux-ci sont strictement nécessaires et ne contiennent aucune information personnelle.",
            },
            {
                heading: "Sous-domaines des outils",
                body: "Chaque outil fonctionne sur son propre sous-domaine (ex. basex.huable.xyz). En cliquant sur « Lancer l'outil », vous accédez à une application web distincte. Tous les outils Huable respectent les mêmes principes de confidentialité décrits ici.",
            },
            {
                heading: "Vos droits (RGPD / ePrivacy)",
                body: "Si vous résidez dans l'Espace économique européen (EEE), vous disposez de droits en vertu du RGPD et de la directive ePrivacy, notamment le droit d'accès, de rectification ou d'effacement de vos données. Comme nous ne collectons pas de données personnelles, il n'y a généralement rien à consulter ou à effacer. Pour toute question, contactez-nous.",
            },
            {
                heading: "Modifications de cette politique",
                body: "Nous pouvons mettre à jour cette politique ponctuellement. Les modifications seront reflétées sur cette page avec une date actualisée.",
            },
            {
                heading: "Contact",
                body: "Pour toute question sur cette politique de confidentialité, contactez-nous à : privacy@huable.xyz",
            },
        ],
    },
    zh: {
        title: "隐私政策",
        lastUpdated: "最后更新：2026年4月20日",
        intro:
            "Huable（huable.xyz）是一套免费的浏览器端实用工具集合。您的隐私对我们至关重要。本政策适用于 huable.xyz 及所有 *.huable.xyz 子域名，说明您在使用本站时可能存储或处理的内容。",
        sections: [
            {
                heading: "我们不收集的数据",
                body: "我们的服务器不收集、存储或处理任何个人数据。所有工具完全在您的浏览器中运行。无需注册账户。我们不使用分析追踪器、指纹识别脚本或广告网络。",
            },
            {
                heading: "浏览器本地存储（localStorage）",
                body: "BaseX、HashX、CryptoX 和 WeJSON 使用浏览器的 localStorage 保存近期操作历史，例如您最近 10 次的结果。所有工具还会将语言偏好作为功能性必要设置进行存储，此设置无需用户同意，且不含任何个人数据。所有本地存储的数据完全存储在您的设备上，不会传输给我们。您可以随时通过浏览器设置清除这些数据。",
            },
            {
                heading: "Cookie（小型文本文件）",
                body: "本站不设置追踪或广告 Cookie。当您响应 Cookie 同意通知时，系统会以 Domain=.huable.xyz 存储一个名为 cookie-consent 的 Cookie，使所有 Huable 工具子域名无需再次询问即可读取您的偏好。此 Cookie 仅包含您的接受或拒绝选择，有效期为一年。我们的托管基础设施（Cloudflare）也可能出于安全和性能目的设置少量必要的技术性 Cookie。这些 Cookie 属于严格必要类型，不包含个人信息。",
            },
            {
                heading: "工具子域名",
                body: "每个工具运行在独立的子域名下（例如 basex.huable.xyz）。点击\"前往工具\"时，您将跳转至独立的网页应用。所有 Huable 工具均遵循本政策中描述的相同隐私原则。",
            },
            {
                heading: "您的权利（GDPR / ePrivacy）",
                body: "如果您位于欧洲经济区（EEA），您在 GDPR 和 ePrivacy 指令下享有访问、更正或删除相关数据的权利。由于我们不收集个人数据，通常没有可供访问或删除的内容。如有任何隐私疑虑，请与我们联系。",
            },
            {
                heading: "政策变更",
                body: "本政策可能不定期更新。任何变更将在本页面顶部以更新日期的形式体现。",
            },
            {
                heading: "联系我们",
                body: "如对本隐私政策有任何疑问，请发送邮件至：privacy@huable.xyz",
            },
        ],
    },
};
