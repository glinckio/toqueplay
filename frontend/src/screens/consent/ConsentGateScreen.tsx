import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { privacyService } from "@/services/privacyService";
import Svg, { Path } from "react-native-svg";
import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/hooks/useTheme";

const TERMS_TEXT = `TERMOS DE USO — ToquePlay

Última atualização: 10/08/2026 · Versão 3.2

1. Aceitação dos Termos
Ao criar uma conta ou continuar utilizando o aplicativo ToquePlay, você concorda integralmente com estes Termos de Uso. Caso não concorde com alguma condição, não utilize o aplicativo.

2. Descrição do Serviço
O ToquePlay é uma plataforma para organização e participação em torneios de vôlei de praia, oferecendo funcionalidades de inscrição, chaveamento, placar ao vivo e gestão de times.

3. Cadastro e Conta
Você é responsável por manter a confidencialidade de sua senha e por todas as atividades realizadas em sua conta. Informe-nos imediatamente caso suspeite de uso não autorizado.

4. Uso Adequado
Você se compromete a utilizar o aplicativo de forma ética e legal, não praticando ações que possam prejudicar outros usuários, organizadores ou o funcionamento do sistema.

5. Propriedade Intelectual
Todo o conteúdo, design, código e marcas do ToquePlay são de propriedade exclusiva da empresa, protegidos pela legislação brasileira de propriedade intelectual.

6. Limitação de Responsabilidade
O ToquePlay não se responsabiliza por danos indiretos decorrentes do uso da plataforma, incluindo cancelamento de torneios por organizadores terceiros.

7. Modificações
Reservamo-nos o direito de alterar estes termos a qualquer momento. Você será notificado sobre alterações relevantes e precisará aceitar as novas condições para continuar utilizando o app.

8. Foro
Fica eleito o foro da comarca de Porto Alegre/RS para dirimir quaisquer controvérsias.`;

const PRIVACY_TEXT = `POLÍTICA DE PRIVACIDADE — ToquePlay

Última atualização: 10/08/2026 · Versão 3.2

Esta política descreve como coletamos, usamos e protegemos seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).

1. Dados Coletados
• Nome completo, e-mail e CPF (cadastro)
• Localização (descoberta de torneios próximos)
• Dados de times e inscrições em torneios
• Preferências de notificação e comunicação

2. Finalidade do Tratamento
Seus dados são utilizados para:
• Criar e manter sua conta
• Inscrever seu time em torneios
• Exibir torneios e partidas próximos
• Enviar notificações sobre jogos e resultados
• Gerar estatísticas anônimas de uso

3. Base Legal
O tratamento é realizado com base no consentimento do titular (Art. 7º, I), na execução de contrato (Art. 7º, V) e no legítimo interesse (Art. 7º, IX).

4. Compartilhamento
Seus dados podem ser compartilhados com organizadores de torneios nos quais você se inscreve. Não vendemos dados a terceiros.

5. Seus Direitos (Art. 18 da LGPD)
Você pode a qualquer momento:
• Acessar seus dados pessoais
• Corrigir dados incompletos ou desatualizados
• Exportar seus dados em formato JSON
• Solicitar a exclusão de sua conta e dados
• Revogar consentimentos opcionais

6. Segurança
Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo criptografia em trânsito e em repouso.

7. Retenção
Seus dados são mantidos enquanto sua conta estiver ativa. Após exclusão, são anonimizados em até 30 dias.

8. Contato com o DPO
Para exercer seus direitos ou esclarecer dúvidas: dpo@toqueplay.com.br

9. Alterações
Esta política pode ser atualizada periodicamente. Você será notificado sobre mudanças significativas.`;

function ConsentRow({
  label,
  detail,
  checked,
  onToggle,
  onReadMore,
  isDark,
}: {
  label: string;
  detail: string;
  checked: boolean;
  onToggle: () => void;
  onReadMore: () => void;
  isDark: boolean;
}) {
  const accentColor = isDark ? "#C6F82A" : "#7C3AED";
  const checkStroke = isDark ? "#12100A" : "#fff";
  const uncheckedBg = isDark ? "rgba(255,255,255,.08)" : "rgba(26,16,48,.08)";
  const uncheckedBorder = isDark ? "rgba(255,255,255,.15)" : "rgba(26,16,48,.15)";
  const rowBg = isDark ? "rgba(255,255,255,.04)" : "rgba(26,16,48,.03)";
  const rowBorder = isDark ? "rgba(255,255,255,.06)" : "rgba(26,16,48,.07)";
  const titleColor = isDark ? "#F5F3FA" : "#1A1030";
  const metaColor = isDark ? "#6E6684" : "#8A829E";
  const chevronColor = isDark ? "#6E6684" : "#A29CB4";

  return (
    <View style={{
      flexDirection: "row", alignItems: "center", gap: 12,
      backgroundColor: rowBg,
      borderWidth: 1, borderColor: rowBorder,
      borderRadius: 14, padding: 14, paddingHorizontal: 16,
    }}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={label}
        style={{
          width: 22, height: 22, borderRadius: 7,
          backgroundColor: checked ? accentColor : uncheckedBg,
          borderWidth: checked ? 0 : 1.5,
          borderColor: uncheckedBorder,
          alignItems: "center", justifyContent: "center",
        }}
      >
        {checked && (
          <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={checkStroke} strokeWidth={3}>
            <Path d="m5 12 5 5 9-11" />
          </Svg>
        )}
      </Pressable>
      <Pressable onPress={onReadMore} style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: titleColor, fontFamily: "Manrope_600SemiBold", fontSize: 13, fontWeight: "600" }}>
          {label}
        </Text>
        <Text style={{ color: metaColor, fontFamily: "Manrope_400Regular", fontSize: 11.5, fontWeight: "400", marginTop: 2 }}>
          {detail}
        </Text>
      </Pressable>
      <Pressable onPress={onReadMore} accessibilityRole="button" accessibilityLabel={`Ler ${label}`}>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={chevronColor} strokeWidth={2.2}>
          <Path d="m9 6 6 6-6 6" />
        </Svg>
      </Pressable>
    </View>
  );
}

function DocumentModal({
  visible,
  title,
  content,
  onClose,
  isDark,
}: {
  visible: boolean;
  title: string;
  content: string;
  onClose: () => void;
  isDark: boolean;
}) {
  const modalBg = "#0B0B0D";
  const titleColor = "#FFFFFF";
  const textColor = "#A9A2BC";
  const borderColor = "rgba(255,255,255,.08)";
  const backBg = "#16181C";
  const backColor = "#FFFFFF";

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" statusBarTranslucent>
      <SafeAreaView style={{ flex: 1, backgroundColor: modalBg }} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 12,
          paddingHorizontal: 22, paddingTop: 16, paddingBottom: 14,
          borderBottomWidth: 1, borderBottomColor: borderColor,
        }}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            style={{
              width: 40, height: 40, borderRadius: 14,
              backgroundColor: backBg,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Icon name="back" size={19} color={backColor} strokeWidth={2.2} />
          </Pressable>
          <Text style={{
            color: titleColor, fontFamily: "Anton_400Regular",
            fontSize: 20, letterSpacing: 0.3, textTransform: "uppercase", flex: 1,
          }}>
            {title}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 22, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={{
            color: textColor, fontFamily: "Manrope_400Regular",
            fontSize: 13, fontWeight: "400", lineHeight: 21,
          }}>
            {content}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export function ConsentGateScreen({ visible }: { visible: boolean }) {
  const { isDark } = useTheme();
  const setHasAcceptedTerms = useAuthStore((s) => s.setHasAcceptedTerms);
  const [submitting, setSubmitting] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [docModal, setDocModal] = useState<"terms" | "privacy" | null>(null);

  const bothChecked = termsChecked && privacyChecked;

  const accentColor = "#C6F82A";
  const primary = "#7C3AED";
  const disabledBg = "#1B1D22";
  const disabledText = "#6E6684";
  const overlayBg = "rgba(0,0,0,0.7)";
  const sheetBg = "#0B0B0D";
  const sheetBorder = "rgba(255,255,255,.08)";
  const handleColor = "rgba(255,255,255,.16)";
  const titleColor = "#FFFFFF";
  const descColor = "#9A94A8";
  const linkColor = "#C6F82A";
  const footerColor = "#6E6684";
  const purple = "#8B5CF6";

  const handleAccept = async () => {
    if (!bothChecked) return;
    setSubmitting(true);
    try {
      await privacyService.acceptTerms();
    } catch {}
    setHasAcceptedTerms(true);
    setSubmitting(false);
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={{ flex: 1, backgroundColor: overlayBg, justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: sheetBg,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 24,
            paddingTop: 10,
            paddingBottom: 48,
            borderTopWidth: 1,
            borderTopColor: sheetBorder,
            ...(isDark ? {} : { shadowColor: "rgba(46,16,101,.25)", shadowOffset: { width: 0, height: -20 }, shadowOpacity: 1, shadowRadius: 60, elevation: 20 }),
          }}>
            {/* Handle */}
            <View style={{
              width: 40, height: 4, borderRadius: 4,
              backgroundColor: handleColor,
              alignSelf: "center", marginBottom: 22,
            }} />

            {/* Shield icon */}
            <View style={{
              width: 62, height: 62, borderRadius: 20,
              backgroundColor: "rgba(124,58,237,0.16)",
              borderWidth: 1, borderColor: "rgba(198,248,42,0.35)",
              alignItems: "center", justifyContent: "center",
              alignSelf: "center", marginBottom: 18,
            }}>
              <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth={1.8}>
                <Path d="M12 2l7 4v5c0 5.25-3.5 8.25-7 10-3.5-1.75-7-4.75-7-10V6l7-4z" />
                <Path d="m9 12 2 2 4-4" strokeWidth={2.2} />
              </Svg>
            </View>

            {/* Title */}
            <Text style={{
              textAlign: "center", color: titleColor,
              fontFamily: "Anton_400Regular", fontSize: 26, letterSpacing: 0.4,
              textTransform: "uppercase",
            }}>
              Termos atualizados
            </Text>

            {/* Description */}
            <Text style={{
              textAlign: "center", color: descColor,
              fontFamily: "Manrope_400Regular", fontSize: 13.5, fontWeight: "400",
              lineHeight: 21.6, marginTop: 10, maxWidth: 300,
              alignSelf: "center",
            }}>
              Atualizamos nossos{" "}
              <Text
                onPress={() => setDocModal("terms")}
                style={{ color: linkColor, fontFamily: "Manrope_600SemiBold", fontWeight: "600" }}
              >Termos de Uso</Text>
              {" "}e{" "}
              <Text
                onPress={() => setDocModal("privacy")}
                style={{ color: linkColor, fontFamily: "Manrope_600SemiBold", fontWeight: "600" }}
              >Política de Privacidade</Text>
              . Para continuar usando o ToquePlay, é necessário aceitar as novas condições.
            </Text>

            {/* Consent items */}
            <View style={{ marginTop: 22, gap: 10 }}>
              <ConsentRow
                label="Termos de Uso"
                detail="Obrigatório · v3.2 · Atualizado em 10/08/2026"
                checked={termsChecked}
                onToggle={() => setTermsChecked((v) => !v)}
                onReadMore={() => setDocModal("terms")}
                isDark={isDark}
              />
              <ConsentRow
                label="Política de Privacidade"
                detail="Obrigatório · v3.2 · Atualizado em 10/08/2026"
                checked={privacyChecked}
                onToggle={() => setPrivacyChecked((v) => !v)}
                onReadMore={() => setDocModal("privacy")}
                isDark={isDark}
              />
            </View>

            {/* CTA */}
            <Pressable
              onPress={handleAccept}
              disabled={!bothChecked || submitting}
              accessibilityRole="button"
              accessibilityLabel="Aceitar e continuar"
              style={{
                backgroundColor: bothChecked ? primary : disabledBg,
                borderRadius: 16, paddingVertical: 17,
                alignItems: "center", justifyContent: "center",
                marginTop: 22,
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{
                  color: bothChecked ? "#FFFFFF" : disabledText,
                  fontFamily: "Oswald_700Bold", fontSize: 14,
                  letterSpacing: 1.4, textTransform: "uppercase",
                }}>Aceitar e continuar</Text>
              )}
            </Pressable>

            {/* Footer disclaimer */}
            <Text style={{
              textAlign: "center", marginTop: 14,
              color: footerColor,
              fontFamily: "Manrope_400Regular", fontSize: 11.5, fontWeight: "400",
              lineHeight: 17.25,
            }}>
              Ao continuar, você concorda com o tratamento de dados conforme a{" "}
              <Text style={{ color: linkColor, fontFamily: "Manrope_500Medium", fontWeight: "500" }}>LGPD (Lei 13.709/2018)</Text>.
            </Text>
          </View>
        </View>
      </Modal>

      <DocumentModal
        visible={docModal === "terms"}
        title="Termos de Uso"
        content={TERMS_TEXT}
        onClose={() => setDocModal(null)}
        isDark={isDark}
      />
      <DocumentModal
        visible={docModal === "privacy"}
        title="Política de Privacidade"
        content={PRIVACY_TEXT}
        onClose={() => setDocModal(null)}
        isDark={isDark}
      />
    </>
  );
}
