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
    "de-DE": {
        title: "Datenschutzerklärung",
        lastUpdated: "Zuletzt aktualisiert: 20. April 2026",
        intro:
            "Huable (huable.xyz) ist eine Sammlung kostenloser, browserbasierter Hilfsprogramme. Ihr Datenschutz ist uns wichtig. Diese Richtlinie gilt für huable.xyz und alle *.huable.xyz-Subdomains und erklärt, was beim Besuch unserer Website gespeichert oder verarbeitet wird.",
        sections: [
            {
                heading: "Daten, die wir NICHT erheben",
                body: "Wir erheben, speichern oder verarbeiten keinerlei personenbezogene Daten auf unseren Servern. Unsere Tools laufen vollständig in Ihrem Browser. Eine Kontoregistrierung ist nicht erforderlich. Wir verwenden keine Analyse-Tracker, Fingerprinting-Skripte oder Werbenetzwerke.",
            },
            {
                heading: "Browser-Speicher (localStorage)",
                body: "BaseX, HashX, CryptoX und WeJSON nutzen den localStorage Ihres Browsers, um den letzten Verlauf zu speichern – zum Beispiel Ihre letzten 10 Ergebnisse. Alle Tools speichern außerdem Ihre Spracheinstellung als funktional notwendige Einstellung; dies erfordert keine Einwilligung und enthält keine personenbezogenen Daten. Alle lokal gespeicherten Daten verbleiben vollständig auf Ihrem Gerät und werden niemals an uns übertragen. Sie können sie jederzeit über die Einstellungen Ihres Browsers löschen.",
            },
            {
                heading: "Cookies",
                body: "Diese Website setzt keine Tracking- oder Werbe-Cookies. Wenn Sie auf das Einwilligungsbanner antworten, wird ein Cookie namens cookie-consent mit Domain=.huable.xyz gesetzt, damit alle Huable-Tool-Subdomains Ihre Präferenz lesen können, ohne erneut zu fragen. Dieses Cookie enthält nur Ihre Wahl (Akzeptieren oder Ablehnen) und läuft nach einem Jahr ab. Unsere Hosting-Infrastruktur (Cloudflare) kann zusätzlich minimale technische Cookies zu Sicherheits- und Leistungszwecken setzen. Diese sind unbedingt erforderlich und enthalten keine personenbezogenen Daten.",
            },
            {
                heading: "Tool-Subdomains",
                body: "Jedes Tool läuft auf seiner eigenen Subdomain (z. B. basex.huable.xyz). Wenn Sie auf \"Tool starten\" klicken, navigieren Sie zu einer separaten Webanwendung. Alle Huable-Tools folgen denselben hier beschriebenen Datenschutzgrundsätzen.",
            },
            {
                heading: "Ihre Rechte (DSGVO / ePrivacy)",
                body: "Wenn Sie sich im Europäischen Wirtschaftsraum (EWR) befinden, haben Sie Rechte nach der DSGVO und der ePrivacy-Richtlinie, einschließlich des Rechts auf Auskunft, Berichtigung oder Löschung Ihrer Daten. Da wir keine personenbezogenen Daten erheben, gibt es in der Regel nichts einzusehen oder zu löschen. Bei Fragen kontaktieren Sie uns bitte.",
            },
            {
                heading: "Änderungen dieser Richtlinie",
                body: "Wir können diese Richtlinie gelegentlich aktualisieren. Änderungen werden auf dieser Seite mit einem aktualisierten Datum angezeigt.",
            },
            {
                heading: "Kontakt",
                body: "Bei Fragen zu dieser Datenschutzerklärung kontaktieren Sie uns unter: privacy@huable.xyz",
            },
        ],
    },
    "pt-PT": {
        title: "Política de Privacidade",
        lastUpdated: "Última atualização: 20 de abril de 2026",
        intro:
            "Huable (huable.xyz) é uma coleção de utilitários gratuitos baseados no navegador. A sua privacidade é importante para nós. Esta política aplica-se a huable.xyz e a todos os subdomínios *.huable.xyz. Explica o que é armazenado ou processado quando utiliza o nosso site.",
        sections: [
            {
                heading: "Dados que NÃO recolhemos",
                body: "Não recolhemos, armazenamos nem processamos quaisquer dados pessoais nos nossos servidores. As nossas ferramentas funcionam inteiramente no seu navegador. Não é necessário registo de conta. Não utilizamos rastreadores de análise, scripts de fingerprinting ou redes publicitárias.",
            },
            {
                heading: "Armazenamento do navegador (localStorage)",
                body: "BaseX, HashX, CryptoX e WeJSON utilizam o localStorage do seu navegador para guardar o histórico recente de operações — por exemplo, os seus últimos 10 resultados. Todas as ferramentas também armazenam a sua preferência de idioma como uma definição funcionalmente necessária; isto não requer consentimento e não contém dados pessoais. Todos os dados armazenados localmente ficam inteiramente no seu dispositivo e nunca são transmitidos para nós. Pode apagá-los a qualquer momento nas definições do seu navegador.",
            },
            {
                heading: "Cookies",
                body: "Este site não define cookies de rastreamento ou publicidade. Quando responde ao aviso de consentimento, é armazenado um cookie chamado cookie-consent com Domain=.huable.xyz para que todos os subdomínios das ferramentas Huable possam ler a sua preferência sem voltar a perguntar. Este cookie contém apenas a sua escolha (aceitar ou recusar) e expira após um ano. A nossa infraestrutura de alojamento (Cloudflare) também pode definir cookies técnicos mínimos para fins de segurança e desempenho. Estes são estritamente necessários e não contêm informações pessoais.",
            },
            {
                heading: "Subdomínios das ferramentas",
                body: "Cada ferramenta funciona no seu próprio subdomínio (ex. basex.huable.xyz). Ao clicar em «Abrir ferramenta», navega para uma aplicação web separada. Todas as ferramentas Huable seguem os mesmos princípios de privacidade aqui descritos.",
            },
            {
                heading: "Os seus direitos (RGPD / ePrivacy)",
                body: "Se se encontra no Espaço Económico Europeu (EEE), tem direitos ao abrigo do RGPD e da Diretiva ePrivacy, incluindo o direito de acesso, retificação ou eliminação dos seus dados. Como não recolhemos dados pessoais, geralmente não há nada a aceder ou eliminar. Para qualquer dúvida, contacte-nos.",
            },
            {
                heading: "Alterações a esta política",
                body: "Podemos atualizar esta política ocasionalmente. As alterações serão refletidas nesta página com uma data atualizada.",
            },
            {
                heading: "Contacto",
                body: "Se tiver questões sobre esta política de privacidade, contacte-nos em: privacy@huable.xyz",
            },
        ],
    },
    ja: {
        title: "プライバシーポリシー",
        lastUpdated: "最終更新日：2026年4月20日",
        intro:
            "Huable（huable.xyz）は、無料のブラウザベースのユーティリティのコレクションです。お客様のプライバシーを大切にしています。本ポリシーは、huable.xyz およびすべての *.huable.xyz サブドメインに適用されます。サイト利用時に何が保存または処理されるかを説明します。",
        sections: [
            {
                heading: "収集しないデータ",
                body: "当サイトのサーバーでは、いかなる個人データも収集・保存・処理しません。すべてのツールはブラウザ上で完全に動作します。アカウント登録は不要です。分析トラッカー、フィンガープリントスクリプト、広告ネットワークは使用しません。",
            },
            {
                heading: "ブラウザストレージ（localStorage）",
                body: "BaseX、HashX、CryptoX、WeJSON は、直近の操作履歴を保存するためにブラウザのlocalStorageを使用します（例：直近10件の結果）。すべてのツールは、機能上必要な設定として言語設定も保存します。これは同意を必要とせず、個人データを含みません。ローカルに保存されたすべてのデータはお使いのデバイス上にのみ存在し、当サイトに送信されることはありません。ブラウザの設定からいつでも削除できます。",
            },
            {
                heading: "Cookie（クッキー）",
                body: "当サイトはトラッキングや広告目的のCookieを設定しません。Cookie同意バナーにご回答いただいた際、cookie-consentという名前のCookieがDomain=.huable.xyzで保存されます。これにより、すべてのHuableツールのサブドメインが再度確認せずにお客様の設定を読み取れます。このCookieにはお客様の選択（承諾または拒否）のみが含まれ、１年後に有効期限が切れます。ホスティングインフラ（Cloudflare）がセキュリティおよびパフォーマンス目的のみで最小限の技術的Cookieを設定する場合があります。これらは必須Cookieであり、個人情報を含みません。",
            },
            {
                heading: "ツールのサブドメイン",
                body: "各ツールは独自のサブドメイン（例：basex.huable.xyz）で動作します。「ツールを開く」をクリックすると、別のウェブアプリケーションに移動します。すべてのHuableツールはここに記載されたのと同じプライバシー方針に従います。",
            },
            {
                heading: "お客様の権利（GDPR・ePrivacy）",
                body: "欧州経済領域（EEA）にお住まいの方は、GDPRおよびePrivacy指令に基づき、データへのアクセス・訂正・削除などの権利を有します。当サイトは個人データを収集していないため、通常はアクセスや削除の対象となるデータはありません。プライバシーに関するご懸念はお問い合わせください。",
            },
            {
                heading: "ポリシーの変更",
                body: "このポリシーは随時更新される場合があります。変更はページ上部の更新日とともにこのページに反映されます。",
            },
            {
                heading: "お問い合わせ",
                body: "このプライバシーポリシーに関するご質問は、privacy@huable.xyz までお問い合わせください。",
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
    "zh-TW": {
        title: "隱私政策",
        lastUpdated: "最後更新：2026年4月20日",
        intro:
            "Huable（huable.xyz）是一套免費的瀏覽器端實用工具集合。您的隱私對我們至關重要。本政策適用於 huable.xyz 及所有 *.huable.xyz 子網域，說明您在使用本站時可能儲存或處理的內容。",
        sections: [
            {
                heading: "我們不收集的資料",
                body: "我們的伺服器不收集、儲存或處理任何個人資料。所有工具完全在您的瀏覽器中執行。無需註冊帳戶。我們不使用分析追蹤器、指紋識別腳本或廣告網路。",
            },
            {
                heading: "瀏覽器本地儲存（localStorage）",
                body: "BaseX、HashX、CryptoX 和 WeJSON 使用瀏覽器的 localStorage 保存近期操作歷史，例如您最近 10 次的結果。所有工具還會將語言偏好作為功能性必要設定進行儲存，此設定無需使用者同意，且不含任何個人資料。所有本地儲存的資料完全儲存在您的裝置上，不會傳輸給我們。您可以隨時透過瀏覽器設定清除這些資料。",
            },
            {
                heading: "Cookie（小型文字檔案）",
                body: "本站不設置追蹤或廣告 Cookie。當您回應 Cookie 同意通知時，系統會以 Domain=.huable.xyz 儲存一個名為 cookie-consent 的 Cookie，使所有 Huable 工具子網域無需再次詢問即可讀取您的偏好。此 Cookie 僅包含您的接受或拒絕選擇，有效期為一年。我們的贗管基礎設施（Cloudflare）也可能出於安全和效能目的設置少量必要的技術性 Cookie。這些 Cookie 屬於嚴格必要類型，不包含個人資訊。",
            },
            {
                heading: "工具子網域",
                body: "每個工具運行在獨立的子網域下（例如 basex.huable.xyz）。點擊「前往工具」時，您將跳轉至獨立的網頁應用程式。所有 Huable 工具均遵循本政策中描述的相同隱私原則。",
            },
            {
                heading: "您的權利（GDPR / ePrivacy）",
                body: "如果您位於歐洲經濟區（EEA），您在 GDPR 和 ePrivacy 指令下享有存取、更正或刪除相關資料的權利。由於我們不收集個人資料，通常沒有可供存取或刪除的內容。如有任何隱私疑慮，請與我們聯繫。",
            },
            {
                heading: "政策變更",
                body: "本政策可能不定期更新。任何變更將在本頁面頂部以更新日期的形式體現。",
            },
            {
                heading: "聯絡我們",
                body: "如對本隱私政策有任何疑問，請發送電子郵件至：privacy@huable.xyz",
            },
        ],
    },
};
