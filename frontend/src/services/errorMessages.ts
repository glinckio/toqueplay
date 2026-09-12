/**
 * Maps backend error `code`s to friendly Brazilian-Portuguese messages.
 * The API returns { statusCode, code, message } where `message` is often the
 * generic "Bad Request Exception" — the useful part is `code`. Used by
 * getErrorMessage() so users see human text instead of "Bad Request Exception".
 */
export const ERROR_MESSAGES: Record<string, string> = {
  // ── Tournaments ──
  TOURNAMENT_NOT_FOUND: "Torneio não encontrado.",
  NOT_TOURNAMENT_OWNER: "Apenas o organizador pode fazer isso.",
  TOURNAMENT_NOT_DRAFT: "Esta ação só é permitida em torneios em rascunho.",
  TOURNAMENT_ALREADY_PUBLISHED: "O torneio já está publicado.",
  TOURNAMENT_CANNOT_CANCEL: "Não é possível cancelar um torneio que já começou.",
  TOURNAMENT_CANNOT_DELETE:
    "Não é possível excluir um torneio em andamento ou já concluído. O histórico de partidas pertence também a quem se inscreveu.",
  ATHLETE_ALREADY_IN_TOURNAMENT:
    "Este atleta já está inscrito por outro time. Numa liga o atleta fica preso ao time pela competição inteira; num circuito, pode trocar de time entre etapas, mas não jogar por dois times na mesma etapa.",
  STAGE_REQUIRED_FOR_CIRCUIT: "Escolha a etapa do circuito para se inscrever.",
  PUBLISH_MISSING_FIELDS: "Preencha todos os campos obrigatórios antes de publicar.",
  INVALID_COORDINATES: "Localização inválida. Verifique o endereço.",
  CANNOT_CHANGE_CORE_FIELDS: "Não é possível alterar o tipo ou formato depois de publicar.",
  FACILITY_NOT_FOUND: "Instalação não encontrada.",
  SPONSOR_NOT_FOUND: "Patrocinador não encontrado.",
  CIRCUIT_REQUIRES_STAGES: "Circuitos precisam de pelo menos uma etapa.",
  STAGE_DATE_TOO_SOON: "A data do torneio precisa ser pelo menos 1 semana no futuro.",
  STAGE_NOT_FOUND: "Etapa não encontrada.",
  TOURNAMENT_TOO_CLOSE_TO_EDIT: "Não é possível editar: faltam menos de 3 dias para o torneio.",
  TOURNAMENT_NOT_IN_PROGRESS: "Esta ação só é permitida com o torneio em andamento.",
  TOURNAMENT_HAS_PENDING_MATCHES: "Não é possível finalizar: ainda há partidas pendentes.",
  REFEREE_NOT_INVITED: "Você não foi convidado para apitar este torneio.",
  REFEREE_ALREADY_IN_MATCH: "Finalize sua partida atual antes de assumir outra.",

  // ── Brackets ──
  BRACKET_NOT_FOUND: "Chaveamento não encontrado.",
  BRACKET_ALREADY_GENERATED: "As chaves já foram geradas.",
  BRACKET_TOO_EARLY: "Ainda é cedo para gerar as chaves.",
  NO_CONFIRMED_TEAMS: "Nenhum time confirmado para gerar as chaves.",
  INVALID_BRACKET_TYPE: "Tipo de chaveamento inválido.",
  TOURNAMENT_NOT_READY: "O torneio ainda não está pronto para esta ação.",
  INVALID_TEAM_COUNT: "Número de times inválido para este formato de chave.",

  // ── Registrations ──
  REGISTRATION_NOT_FOUND: "Inscrição não encontrada.",
  NOT_REGISTRATION_OWNER: "Você não é dono desta inscrição.",
  TOURNAMENT_NOT_OPEN: "As inscrições deste torneio não estão abertas.",
  REGISTRATION_DEADLINE_EXPIRED: "O prazo de inscrição já expirou.",
  TEAM_SIZE_MISMATCH: "O time não tem o número de jogadores exigido pela categoria.",
  NO_SPOTS_AVAILABLE: "Não há mais vagas disponíveis.",
  TEAM_ALREADY_REGISTERED: "Este time já está inscrito neste torneio.",

  // ── Friendlies ──
  FRIENDLY_NOT_FOUND: "Amistoso não encontrado.",
  NOT_FRIENDLY_REQUESTER: "Você não é o autor deste desafio.",
  NOT_FRIENDLY_CHALLENGED: "Você não é o time desafiado.",
  FRIENDLY_ALREADY_RESPONDED: "Este amistoso já foi respondido.",
  FRIENDLY_ALREADY_CANCELLED: "Este amistoso já foi cancelado.",
  CANNOT_ACCEPT_OWN_FRIENDLY: "Você não pode aceitar o próprio desafio.",
  MISSING_CHALLENGED_TARGET: "Selecione um time adversário.",
  FRIENDLY_NOT_ACCEPTED: "O amistoso ainda não foi aceito.",
  NOT_CHALLENGED_TEAM_OWNER: "Apenas o dono do time desafiado pode responder ao amistoso.",
  INVALID_ATHLETE_COUNT: "Número de jogadores inválido para esta modalidade.",
  ATHLETE_NOT_IN_TEAM: "Um dos jogadores não pertence ao time.",
  INVALID_REFEREE_CODE: "Código de árbitro inválido.",
  NOT_FRIENDLY_PARTICIPANT: "Você não participa deste amistoso.",
  CANNOT_START_MATCH_OUTSIDE_DAY: "A partida só pode começar no dia agendado.",
  CANNOT_START_MATCH_BEFORE_TIME: "A partida só pode começar a partir do horário agendado.",

  // ── Matches ──
  MATCH_NOT_FOUND: "Partida não encontrada.",
  MATCH_ALREADY_STARTED: "A partida já começou.",
  MATCH_ALREADY_FINISHED: "A partida já foi finalizada.",
  MATCH_NOT_IN_PROGRESS: "A partida não está em andamento.",
  MATCH_NOT_SCHEDULED: "A partida não está agendada.",
  INVALID_POINT_TEAM: "Time inválido para marcar o ponto.",
  NOT_MATCH_REFEREE: "Você não é o árbitro desta partida.",
  PLAYER_NOT_IN_TEAM: "Jogador não pertence ao time.",
  SCORE_NOT_WINNING: "O placar informado não fecha o set.",
  LINEUP_REQUIRED: "Defina a escalação antes de começar a partida.",
  MISSING_OPPONENT: "A partida ainda não tem adversário definido.",

  // ── Teams ──
  TEAM_NOT_FOUND: "Time não encontrado.",
  NOT_TEAM_OWNER: "Apenas o capitão do time pode fazer isso.",
  MEMBER_NOT_FOUND: "Membro não encontrado.",
  MEMBER_ALREADY_IN_TEAM: "Este jogador já está no time.",
  USER_NOT_FOUND_BY_EMAIL: "Nenhum usuário encontrado com esse email.",
  CANNOT_REMOVE_OWNER: "Não é possível remover o capitão do time.",
  GUEST_NAME_REQUIRED: "Informe o nome do convidado.",
  CPF_ALREADY_IN_TEAM: "Este CPF já está no time.",
  INVALID_CPF: "CPF inválido.",
  INVITATION_NOT_FOUND: "Convite não encontrado.",
  INVITATION_ALREADY_PENDING: "Já existe um convite pendente para este jogador.",
  INVITATION_ALREADY_RESPONDED: "Este convite já foi respondido.",
  USER_ALREADY_TEAM_MEMBER: "Este jogador já faz parte do time.",
  INVALID_FILE_TYPE: "Tipo de arquivo inválido.",
  FILE_TOO_LARGE: "Arquivo muito grande.",

  // ── Auth (mais comuns) ──
  EMAIL_ALREADY_EXISTS: "Este email já está cadastrado.",
  CPF_ALREADY_EXISTS: "Este CPF já está cadastrado.",
  INVALID_CREDENTIALS: "Email ou senha incorretos.",
  INVALID_PASSWORD: "Senha incorreta.",
  EMAIL_NOT_VERIFIED: "Confirme seu email antes de entrar.",
  EMAIL_NOT_FOUND: "Email não encontrado.",
  INVALID_OR_EXPIRED_CODE: "Código inválido ou expirado.",
  CODE_RESEND_COOLDOWN: "Aguarde um momento antes de reenviar o código.",
  PASSWORDS_DO_NOT_MATCH: "As senhas não conferem.",
  INVALID_PASSWORD_FORMAT: "A senha não atende aos requisitos mínimos.",
};

export function messageForCode(code?: string): string | undefined {
  return code ? ERROR_MESSAGES[code] : undefined;
}
