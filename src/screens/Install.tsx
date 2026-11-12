import { Download, Share, PlusSquare, Smartphone, Check } from "lucide-react";
import {PROFILE_INSTALL_URL} from '../install-config.ts';
export default function Install() {
  const standalone =
    matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone;
  return (
    <div className="install-screen">
      <div className="page-title">
        <h1>Instalar no iPhone</h1>
      </div>
      <section className="install-intro">
        <div className="install-app-icon">
          <img
            src={import.meta.env.BASE_URL + "icons/apple-touch-icon.png"}
            alt="Ícone Cadência"
          />
        </div>
        <div>
          <h2>Cadência na Tela de Início</h2>
          <p>Abra seu diário em tela cheia, direto pelo ícone.</p>
          {standalone && (
            <p className="installed">
              <Check size={16} /> Você já está em modo app.
            </p>
          )}
        </div>
      </section>
      <section className="settings-section">
        <h2>Perfil de configuração</h2>
        <p>
          O perfil cria um atalho Web Clip para este site. Ele contém somente o
          nome, ícone e endereço do Cadência.
        </p>
        <a
          className="primary profile-download"
          href={PROFILE_INSTALL_URL}
          target="_blank" rel="noopener noreferrer"
        >
          <Download size={19} /> Baixar perfil de configuração
        </a>
        <ol className="install-steps">
          <li>
            <b>Baixe usando o Safari.</b>
            <span>
              Confirme o download do perfil quando o iPhone perguntar.
            </span>
          </li>
          <li>
            <b>Abra os Ajustes do iPhone.</b>
            <span>
              Toque em Perfil Baixado. Se não aparecer, procure Geral → VPN e
              Gerenciamento de Dispositivo.
            </span>
          </li>
          <li>
            <b>Confira o perfil Cadência.</b>
            <span>
              Revise o conteúdo e conclua a instalação no próprio iPhone. Você
              pode remover o perfil depois nos Ajustes.
            </span>
          </li>
        </ol>
        <p className="fine">
          Perfil gerado para você, sem assinatura digital. O iPhone pode
          mostrá-lo como não assinado. Não configura VPN, certificados,
          gerenciamento remoto ou conta.
        </p>
      </section>
      <section className="settings-section">
        <h2>Instalação pelo Safari</h2>
        <p>
          Esta é também a instalação documentada pela Apple para receber Web
          Push no iPhone (iOS 16.4 ou posterior). O comportamento das
          notificações no atalho criado pelo perfil precisa ser conferido no
          aparelho.
        </p>
        <ol className="install-steps">
          <li>
            <b>
              <Share size={17} /> Abra Compartilhar
            </b>
            <span>No Safari, com o site aberto.</span>
          </li>
          <li>
            <b>
              <PlusSquare size={17} /> Adicionar à Tela de Início
            </b>
            <span>Ative “Abrir como App da Web”, se essa opção aparecer.</span>
          </li>
          <li>
            <b>
              <Smartphone size={17} /> Abra pelo ícone Cadência
            </b>
            <span>
              Entre na sua conta. Em Ajustes → Notificações, ative os alertas
              deste aparelho.
            </span>
          </li>
        </ol>
      </section>
    </div>
  );
}
