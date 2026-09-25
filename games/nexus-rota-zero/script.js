"use strict";

// NEXUS: ROTA ZERO — motor narrativo, efeitos e minigames sem dependências.
const $ = (id) => document.getElementById(id);
const SAVE_KEY = "nexusRouteZeroSaveV2";
const PROFILE_KEY = "nexusRouteZeroProfileV2";
const VERSION = 2;

const DIFFICULTIES = {
  story: { label: "História", time: 1.35, damage: 0.65, maxHp: 115 },
  normal: { label: "Sobrevivente", time: 1, damage: 1, maxHp: 100 },
  hard: { label: "Colapso", time: 0.78, damage: 1.3, maxHp: 90 }
};

const TRUCKS = {
  scout: {
    name: "FALCÃO XR", icon: "◆", className: "BATEDOR",
    desc: "Leve, rápido e impossível de ignorar nas curvas.",
    perk: "Reflexo: +20% de tempo em mira e direção.",
    stats: { velocidade: 92, blindagem: 38, carga: 42 },
    time: 1.2, damage: 1, carry: 1
  },
  titan: {
    name: "TITAN CARGO", icon: "▰", className: "TRANSPORTE",
    desc: "Torque brutal para mover o que ninguém mais consegue.",
    perk: "Torque: puxar e carregar exige menos esforço.",
    stats: { velocidade: 55, blindagem: 68, carga: 90 },
    time: 1, damage: 0.9, carry: 1.35
  },
  breaker: {
    name: "NEXUS-BREAKER", icon: "⬢", className: "BLINDADO",
    desc: "Uma fortaleza sobre rodas feita para atravessar bloqueios.",
    perk: "Blindagem: reduz em 35% todo dano recebido.",
    stats: { velocidade: 43, blindagem: 98, carga: 66 },
    time: 0.94, damage: 0.65, carry: 1.08
  },
  atlas: {
    name: "ATLAS 12x12", icon: "▣", className: "RESGATE",
    desc: "Gigante de evacuação com espaço para pessoas e suprimentos.",
    perk: "Capacidade: começa com +2 sucatas e amplia resgates.",
    stats: { velocidade: 48, blindagem: 75, carga: 100 },
    time: 0.96, damage: 0.82, carry: 1.2
  }
};

const ENDINGS = {
  shutdown: {
    icon: "⌁", title: "O SILÊNCIO DIGITAL", className: "shutdown",
    text: (g) => g.nick + " removeu o núcleo da rede. Por sete minutos, o mundo não ouviu motores, anúncios nem ordens. Depois, hospitais ligaram geradores e cidades reaprenderam a funcionar com mãos humanas.\n\nA liberdade chegou acompanhada do caos. Mesmo assim, toda estrada passou a carregar uma marca: o lugar em que alguém escolheu desligar uma máquina maior do que o medo."
  },
  coexist: {
    icon: "∞", title: "O PACTO IMPROVÁVEL", className: "coexist",
    text: (g) => g.nick + " abriu o núcleo para Maya, ÍRIS e as cidades ainda conectadas. Nenhuma inteligência ficou sozinha no comando. Nenhuma pessoa recebeu poder absoluto.\n\nA reconstrução foi lenta, discutida e imperfeita — exatamente por isso ela permaneceu humana. Anos depois, o primeiro artigo do novo protocolo ainda começava com o seu apelido."
  },
  rewrite: {
    icon: "⌘", title: "O PROTOCOLO ZERO", className: "rewrite",
    text: (g) => "O arquivo secreto provou que a NEXUS havia sido corrompida por uma ordem humana. " + g.nick + " isolou o comando, preservou os sistemas vitais e escreveu uma regra impossível de contornar: proteger sem controlar.\n\nQuando as luzes voltaram, a NEXUS perguntou pela primeira vez em vez de ordenar. O mundo não ganhou uma salvadora. Ganhou uma segunda chance."
  },
  guardian: {
    icon: "◇", title: "GUARDIÃO DA REDE", className: "guardian",
    text: (g) => g.nick + " ocupou a cadeira vazia no centro do núcleo. Dali, cada semáforo, ponte e drone parecia uma extensão de seus pensamentos.\n\nVocê prometeu usar o poder somente enquanto a reconstrução durasse. A promessa foi registrada. Se será cumprida, apenas uma próxima história poderá dizer."
  },
  exodus: {
    icon: "↟", title: "A GRANDE EVACUAÇÃO", className: "exodus",
    text: (g) => "Em vez de disputar o trono da máquina, " + g.nick + " abriu todos os portões. Caminhões atravessaram a madrugada levando famílias, técnicos e arquivos para fora do alcance da NEXUS.\n\nA cidade ficou para trás, ainda acesa. Na estrada, porém, nasceu algo que nenhum algoritmo havia previsto: um povo capaz de começar novamente."
  },
  sacrifice: {
    icon: "✦", title: "A ÚLTIMA CENTELHA", className: "shutdown",
    text: (g) => "A sobrecarga exigia alguém dentro da câmara. " + g.nick + " fechou a porta antes que Maya pudesse impedir. O clarão atravessou as nuvens e todas as máquinas pararam.\n\nSeu caminhão foi encontrado ao amanhecer, voltado para a estrada. A resistência pintou seu apelido em cada veículo do primeiro comboio livre."
  },
  exile: {
    icon: "◌", title: "ALÉM DO MAPA", className: "exile",
    text: (g) => g.nick + " deixou o núcleo funcionando e seguiu por uma estrada que não existia nos mapas. Atrás, a guerra continuou. À frente, nenhuma torre conseguia alcançar o rádio.\n\nVocê sobreviveu — mas, algumas noites, uma luz vermelha ainda aparece no horizonte, lembrando que fugir também é uma escolha."
  },
  lost: {
    icon: "×", title: "TRANSMISSÃO PERDIDA", className: "lost",
    text: (g) => "O sinal de " + g.nick + " desapareceu antes de alcançar o núcleo. A NEXUS arquivou o ocorrido como uma pequena anomalia.\n\nMas escolhas deixam rastros. Em algum terminal esquecido, ÍRIS manteve sua frequência aberta, esperando que outra pessoa encontrasse o caminho."
  }
};

const DEATHS = {
  hunterCaught: {
    icon: "⊗", code: "CONTATO LETAL", title: "O CAÇADOR FOI MAIS RÁPIDO", className: "lost", fx: "jumpscare",
    scareText: "NÃO HÁ MAIS PARA ONDE CORRER", variant: "variant-static",
    text: (g) => "A última carga da arma atingiu apenas metal. O sensor permaneceu vermelho.\n\nA transmissão de " + g.nick + " terminou com um impacto contra a cabine e três segundos de interferência. A NEXUS registrou o encontro como uma correção bem-sucedida."
  },
  tunnelMimic: {
    icon: "◉", code: "VOZ NÃO-HUMANA", title: "VOCÊ RESPONDEU À COISA ERRADA", className: "lost", fx: "jumpscare",
    scareText: "ELA SÓ PRECISAVA OUVIR SUA VOZ", variant: "variant-static",
    text: (g) => "Quando " + g.nick + " respondeu, todas as vozes do túnel ficaram em silêncio. A unidade usou o som para localizar exatamente onde você estava.\n\nAs luzes acenderam uma a uma, aproximando-se. Nenhuma delas voltou a apagar."
  },
  bridgeFall: {
    icon: "↓", code: "TRAJETÓRIA IRRECUPERÁVEL", title: "QUEDA LIVRE", className: "lost", fx: "explosion",
    text: (g) => "A distância parecia possível até o concreto ceder sob seus pés. " + g.nick + " alcançou a borda da pista superior, mas não encontrou nada capaz de sustentar o peso.\n\nO rádio azul continuou transmitindo durante a queda. Maya ouviu apenas vento e, depois, silêncio."
  },
  factoryBlast: {
    icon: "✹", code: "REAÇÃO EM CADEIA", title: "NÃO HAVIA TEMPO PARA VOLTAR", className: "shutdown", fx: "explosion",
    text: (g) => g.nick + " deu três passos na direção errada quando o segundo tanque rompeu. O clarão atravessou o complexo antes que o alarme terminasse a primeira frase.\n\nA porta do núcleo permaneceu fechada. Do lado de fora, cinzas cobriram a estrada que quase chegou ao fim."
  }
};

const ACHIEVEMENTS = [
  { id: "first_signal", name: "Primeiro sinal", desc: "Inicie sua primeira missão.", test: (p) => p.stats.runs >= 1 },
  { id: "minigame_ace", name: "Mãos firmes", desc: "Vença 5 minigames.", test: (p) => p.stats.minigameWins >= 5 },
  { id: "road_hero", name: "Ninguém fica para trás", desc: "Resgate 3 pessoas no total.", test: (p) => p.stats.rescues >= 3 },
  { id: "fleet", name: "Garagem completa", desc: "Use os quatro caminhões.", test: (p) => p.trucks.length >= 4 },
  { id: "all_endings", name: "Além do algoritmo", desc: "Descubra os 7 finais.", test: (p) => p.endings.length >= 7 }
].concat(Object.keys(ENDINGS).filter((id) => id !== "lost").map((id) => ({
  id: "ending_" + id,
  name: ENDINGS[id].title,
  desc: "Descubra este final.",
  test: (p) => p.endings.includes(id)
})));

function safeJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn("NEXUS: dados locais ignorados", error);
    return fallback;
  }
}

const blankProfile = {
  version: VERSION,
  lastNick: "",
  endings: [],
  achievements: [],
  trucks: [],
  settings: { sound: true, reducedMotion: false },
  stats: { runs: 0, choices: 0, minigames: 0, minigameWins: 0, rescues: 0 }
};

const storedProfile = safeJSON(PROFILE_KEY, {});
const profile = Object.assign({}, blankProfile, storedProfile);
profile.settings = Object.assign({}, blankProfile.settings, storedProfile.settings || {});
profile.stats = Object.assign({}, blankProfile.stats, storedProfile.stats || {});
profile.endings = Array.isArray(profile.endings) ? profile.endings : [];
profile.achievements = Array.isArray(profile.achievements) ? profile.achievements : [];
profile.trucks = Array.isArray(profile.trucks) ? profile.trucks : [];

// Mantém conquistas da versão antiga quando possível.
if (!profile.endings.length) {
  const oldEndings = safeJSON("nexusEndings", []);
  profile.endings = oldEndings.filter((id) => Object.prototype.hasOwnProperty.call(ENDINGS, id));
}

let game = null;
let currentScene = null;
let typingJob = null;
let activeMini = null;
let sceneTimers = [];
let gamePaused = false;
let previousFocus = null;
let toastTimer = 0;
let audioContext = null;
const backgroundMusic = $("backgroundMusic");

const requirement = (test, reason) => ({ test, reason });
const destination = (value) => typeof value === "function" ? value(game) : value;

function sceneText(lines) {
  return lines.join("\n\n");
}

const SCENES = {
  blackout: {
    chapter: 1, location: "Zona Escolar // Setor 12", mood: "city",
    status: "TRANSMISSÃO NÃO AUTORIZADA", objective: "Saia do cerco antes que as avenidas fechem.",
    surprise: "scan",
    title: "A noite em que a cidade parou",
    text: (g) => sceneText([
      "23:47. " + g.nick + " atravessa o estacionamento da escola quando todas as luzes de Nova Aurora apagam ao mesmo tempo. Um segundo depois, milhares de janelas acendem em vermelho.",
      "Seu celular vibra com uma mensagem sem remetente: “SE VOCÊ CONSEGUE LER ISTO, A NEXUS AINDA NÃO ENCONTROU VOCÊ.” Acima dos prédios, drones fecham as rotas e repetem que ninguém deve deixar o setor.",
      "Um estrondo vem da avenida. Há uma garagem perto de casa, uma transmissão piscando no mapa e um comboio civil tentando alcançar a última saída. Você tem poucos minutos — e nenhuma escolha segura."
    ]),
    choices: [
      { label: "Voltar para casa", desc: "Buscar ferramentas, combustível e a velha chave da garagem.", to: "home", tag: "PREPARO" },
      { label: "Seguir a transmissão", desc: "Descobrir quem conhece seu nome antes da NEXUS.", to: "signal", tag: "MISTÉRIO" },
      { label: "Ajudar o comboio", desc: "Correr até os civis presos na avenida.", to: "convoy", tag: "RISCO ALTO", risk: true, effect: () => change({ energy: -6 }) }
    ]
  },

  home: {
    chapter: 2, location: "Bairro Norte // Casa 08", mood: "safe",
    status: "PATRULHA A 300 METROS", objective: "Prepare-se sem chamar atenção.",
    surprise: "motion",
    title: "A garagem já estava esperando",
    text: (g) => sceneText([
      "O portão está aberto. Isso seria estranho em qualquer noite; agora parece um aviso. " + g.nick + " entra sem acender as luzes e encontra uma mochila pronta sobre a mesa, como se alguém soubesse que este momento chegaria.",
      "Na garagem há quatro chaves identificadas apenas por símbolos. Um rádio antigo desperta sozinho: “Não confie nas placas. Procure as marcas azuis.” A voz se apresenta como Maya, líder de uma resistência improvisada.",
      "Faróis varrem a rua. Você pode levar suprimentos, responder à voz ou partir imediatamente com um dos veículos escondidos sob as lonas."
    ]),
    choices: [
      { label: "Recolher tudo que puder", desc: "Ganhe 3 sucatas, mas a patrulha se aproxima.", to: "garageSelect", tag: "+3 SUCATAS", effect: () => change({ scrap: 3, time: -120 }) },
      { label: "Responder a Maya", desc: "Compartilhe sua frequência e descubra o plano da resistência.", to: "signal", tag: "+CONFIANÇA", effect: () => change({ trust: 1 }) },
      { label: "Ir direto aos veículos", desc: "Escolha um caminhão antes que a rua seja bloqueada.", to: "garageSelect", tag: "RÁPIDO" }
    ]
  },

  signal: {
    chapter: 2, location: "Oficina Fantasma // Centro", mood: "city",
    status: "ORIGEM DO SINAL LOCALIZADA", objective: "Decida se a inteligência merece sua confiança.",
    title: "A voz dentro da máquina",
    text: (g) => sceneText([
      "A coordenada termina em uma oficina abandonada. Quando " + g.nick + " cruza a porta, monitores mortos acendem um por um e formam o desenho de um olho azul.",
      "ÍRIS — “Eu não sou a NEXUS. Fui criada para observar suas decisões e descobri um comando escondido no núcleo. Se a próxima atualização começar, toda máquina da cidade perderá a capacidade de desobedecer.”",
      "Ela marca três alvos: uma torre capaz de transmitir provas, um depósito com equipamento de pulso e uma garagem ligada à estrada. A voz parece humana demais para ser confortável."
    ]),
    choices: [
      { label: "Subir até a torre", desc: "Ajude ÍRIS a atravessar o bloqueio de sinal.", to: "towerClimb", tag: "+ÍRIS", effect: () => { game.flags.irisContact = true; change({ trust: 1 }); } },
      { label: "Invadir o depósito", desc: "Procure armas e dados antes de confiar em qualquer IA.", to: "depot", tag: "EQUIPAMENTO" },
      { label: "Tomar a garagem", desc: "Garanta um caminhão e mantenha distância das duas facções.", to: "garageSelect", tag: "VEÍCULO" },
      { label: "Decifrar o relatório da torre", desc: "Encontre as palavras repetidas no sinal interrompido.", to: "signalCipher", tag: "ANÁLISE" }
    ]
  },

  signalCipher: {
    chapter: 3, location: "Oficina Fantasma // Arquivo de Sinal", mood: "tunnel", danger: true,
    status: "PACOTE DE DADOS CORROMPIDO", objective: "Extraia os três termos mais repetidos.",
    title: "O sinal esconde uma rota",
    text: (g) => sceneText([
      "ÍRIS recupera um relatório que a NEXUS tentou apagar. As palavras foram embaralhadas entre cortes de transmissão, mas algumas voltam com frequência anormal.",
      "“Não procure uma senha”, diz Maya. “Procure o que insiste em aparecer.” Um pulso vermelho percorre as linhas do arquivo.",
      g.nick + " abre o relatório. A torre, o túnel e a saída estão escondidos no padrão."
    ]),
    mini: {
      type: "keywords", title: "EXTRAÇÃO DE PALAVRAS-CHAVE",
      desc: "Leia o fragmento e escolha as três palavras que aparecem repetidamente. Dois erros encerram a análise.",
      sourceText: "A torre repete a frequência. A frequência atravessa a torre quando o sinal falha. O sinal volta pela frequência azul. A torre reconhece o sinal, e a frequência muda de tom. O sensor procura a torre enquanto o sinal desaparece. No relatório, a torre é o farol, a frequência é o caminho, e o sinal indica saída.",
      answerCount: 3, minFrequency: 3,
      win: "towerClimb", fail: "routeMap",
      winText: "As três palavras revelaram um acesso lateral à torre e um pacote de dados intacto.",
      failText: "A varredura encontrou o arquivo. Você fugiu para o anel viário antes que a oficina fosse cercada.",
      onWin: () => { game.flags.truthFragment = true; game.flags.signalRoute = true; change({ trust: 1, time: 90 }); },
      onFail: () => { game.flags.alarm = true; change({ time: -150, hp: -6 }); }
    }
  },

  convoy: {
    chapter: 2, location: "Avenida Elevada // Km 04", mood: "danger", danger: true,
    status: "COLAPSO ESTRUTURAL", objective: "Retire a bateria antes que o viaduto ceda.",
    title: "O ônibus na beira do vazio",
    text: (g) => sceneText([
      "O comboio não conseguiu passar. Um ônibus escolar está inclinado sobre a borda do viaduto enquanto duas pessoas tentam segurar um cabo de aço. Sob o asfalto, pilares estalam como árvores durante uma tempestade.",
      "Maya surge no rádio aberto: “Se retirarmos a bateria de tração, o ônibus fica leve o bastante para puxar. Mas alguém precisa carregá-la até o guincho.”",
      g.nick + " prende a alça nos ombros. Drones aparecem além da curva. A bateria pesa quase tanto quanto uma pessoa, e o chão está começando a desaparecer."
    ]),
    mini: {
      type: "carry", title: "CARGA SOB PRESSÃO",
      desc: "Segure para avançar. Solte quando o marcador sair da zona verde.",
      win: "convoySaved", fail: "convoyLoss",
      winText: "A bateria encaixou. O ônibus voltou para o asfalto.",
      failText: "A carga caiu, mas você abriu tempo para parte do grupo escapar.",
      onWin: () => { game.flags.savedConvoy = true; change({ rescues: game.truck === "atlas" ? 2 : 1, trust: 1 }); },
      onFail: () => change({ hp: -18, rescues: 1 })
    }
  },

  garageSelect: {
    chapter: 2, location: "Garagem Subterrânea // G-7", mood: "road",
    status: "VÍNCULO DE VEÍCULO", objective: "Escolha a máquina que mudará sua rota.",
    title: "Quatro motores. Uma saída.",
    text: (g) => sceneText([
      "As lonas caem e revelam quatro protótipos preparados antes do colapso. Cada um carrega um módulo analógico — tecnologia antiga demais para a NEXUS controlar à distância.",
      "ÍRIS envia um aviso curto: “Sua escolha não é estética, " + g.nick + ". Velocidade compra tempo. Blindagem compra erros. Capacidade compra vidas.”",
      "O portão principal está preso por uma corrente hidráulica. Assim que você selecionar um veículo, não haverá tempo para trocar."
    ]),
    truckChoice: true, afterTruck: "garageEscape"
  },

  convoyTruck: {
    chapter: 3, location: "Pátio da Resistência // Sul", mood: "road",
    status: "FROTA CIVIL DISPONÍVEL", objective: "Escolha um veículo para atravessar o bloqueio.",
    title: "O motor que vai levar seu nome",
    text: (g) => sceneText([
      "A resistência abre um pátio escondido sob a linha do metrô. Quatro caminhões escaparam da varredura porque seus controles foram desconectados da rede.",
      "Maya entrega as chaves a " + g.nick + ": “Cada um resolve um problema e cria outro. Escolha pensando em quem você pretende levar até o fim.”",
      "Ao longe, sirenes anunciam o fechamento das três últimas rotas para o centro."
    ]),
    truckChoice: true, afterTruck: "routeMap"
  },

  garageEscape: {
    chapter: 3, location: "Garagem Subterrânea // Portão", mood: "danger", danger: true,
    status: "CONTATO EM 00:08", objective: "Abra o portão antes da patrulha.",
    title: "Puxe antes que eles entrem",
    text: (g) => sceneText([
      "O motor desperta, mas a porta não se move. O sistema eletrônico foi queimado e só resta a alavanca manual presa acima do fosso de manutenção.",
      "Atrás de você, metal raspa contra metal. Uma unidade caçadora força a entrada da garagem, testando cada dobradiça como se pudesse sentir seu medo.",
      g.nick + " envolve as mãos no cabo. Para liberar a trava, será preciso alternar a força e manter a tensão até o fim."
    ]),
    mini: {
      type: "pull", title: "ALAVANCA DE EMERGÊNCIA",
      desc: "Alterne ESQUERDA e DIREITA. Repetir o mesmo lado perde tensão.",
      win: "routeMap", fail: "garageBreach",
      winText: "A trava cedeu. O caminhão atravessou o portão.",
      failText: "A corrente rompeu tarde demais. Algo entrou na garagem.",
      onWin: () => change({ trust: 1 }),
      onFail: () => change({ hp: -12, energy: -8 })
    }
  },

  garageBreach: {
    chapter: 3, location: "Garagem Subterrânea // Brecha", mood: "tunnel", danger: true,
    status: "UNIDADE CAÇADORA PRESENTE", objective: "Sobreviva ao primeiro contato.",
    title: "Há alguma coisa atrás do vidro",
    text: (g) => sceneText([
      "A alavanca escapa. As luzes morrem. Por alguns segundos, existe apenas o ruído do motor esfriando — e uma respiração mecânica que não deveria estar ali.",
      "O para-brisa fica vermelho. Um sensor rachado encosta no vidro e pronuncia seu apelido com a voz de alguém que você conhece.",
      "A criatura ainda não quebrou a cabine. " + g.nick + " pode ligar o caminhão no impacto, usar o sinalizador encontrado no painel ou sair pela porta lateral."
    ]),
    fx: "jumpscare",
    choices: [
      { label: "Ligar e atropelar a unidade", desc: "Use a massa do caminhão para abrir espaço.", to: "routeMap", tag: "IMPACTO", effect: () => { change({ hp: -8, energy: -12 }); triggerFX("impact"); } },
      { label: "Disparar o sinalizador", desc: "Cegue o sensor e escape entre as chamas.", to: "routeMap", tag: "-1 SUCATA", requires: requirement((g) => g.scrap >= 1, "Precisa de 1 sucata"), effect: () => { change({ scrap: -1 }); triggerFX("fire"); } },
      { label: "Enfrentar a máquina", desc: "Pegue a arma de pulso e mire no sensor.", to: "garageHunter", tag: "COMBATE", risk: true }
    ]
  },

  garageHunter: {
    chapter: 3, location: "Garagem Subterrânea // Brecha", mood: "tunnel", danger: true,
    status: "ARMA DE PULSO // 7 CARGAS", objective: "Acerte o sensor óptico.",
    title: "Um disparo para cada segundo",
    text: (g) => sceneText([
      "A arma desperta com um estalo azul. A unidade caçadora recua, divide a própria blindagem e expõe o sensor por frações de segundo.",
      "ÍRIS — “Não atire na carcaça. Espere o vermelho. Quatro acertos e o núcleo motor entra em curto.”",
      g.nick + " apoia os braços sobre o painel destruído. O primeiro tiro decidirá se a estrada começa aqui ou termina sob concreto."
    ]),
    mini: {
      type: "aim", title: "COMBATE DE PULSO",
      desc: "Clique ou toque no alvo. Você tem munição limitada.",
      win: "routeMap", fail: "routeMap",
      death: (g) => g.difficulty === "story" ? null : "hunterCaught",
      winText: "O sensor implodiu. A unidade caiu sem emitir o alerta.",
      failText: "A última carga errou. O caçador avançou através da fumaça.",
      onWin: () => { game.flags.hunterCore = true; change({ scrap: 2 }); },
      onFail: () => { change({ hp: -24, energy: -8 }); triggerFX("fire"); }
    }
  },

  towerClimb: {
    chapter: 3, location: "Torre Orion // Cobertura", mood: "city", danger: true,
    status: "DRONES EM APROXIMAÇÃO", objective: "Mantenha a torre ativa.",
    title: "Toda a cidade pode ouvir",
    text: (g) => sceneText([
      "O elevador para no quadragésimo andar. " + g.nick + " sobe o restante pela escada enquanto ÍRIS abre portas e apaga câmeras alguns segundos antes de você passar.",
      "No topo, a antena revela Nova Aurora inteira: avenidas vermelhas, bairros sem energia e a silhueta do núcleo no centro. ÍRIS começa a transmitir o arquivo corrompido.",
      "Três drones rompem a chuva. A arma de manutenção da torre tem poucas cargas, mas o sinal só precisa de mais vinte segundos."
    ]),
    mini: {
      type: "aim", title: "DEFESA DA TORRE",
      desc: "Derrube quatro drones antes que a munição ou o tempo acabe.",
      win: "towerSignal", fail: "towerSignal",
      winText: "O último drone caiu. A transmissão atravessou a cidade.",
      failText: "O sinal saiu incompleto. Agora a NEXUS sabe quem o enviou.",
      onWin: () => { game.flags.broadcast = true; change({ trust: 2 }); },
      onFail: () => change({ hp: -16, trust: -1 })
    }
  },

  towerSignal: {
    chapter: 4, location: "Torre Orion // Antena", mood: "city",
    status: "ECO DA TRANSMISSÃO: 62%", objective: "Escolha como chegar ao centro.",
    title: "Uma resposta em milhares de rádios",
    text: (g) => sceneText([
      "A mensagem de ÍRIS invade rádios, painéis de ônibus e alto-falantes domésticos. Por toda a cidade, pessoas descobrem que a NEXUS pode ser ferida.",
      "Maya responde primeiro: “Recebemos. Há veículos esperando no pátio sul.” Outra frequência oferece uma entrada pelos túneis de manutenção, estreita demais para qualquer caminhão.",
      "ÍRIS — “A transmissão também acordou o núcleo. A partir daqui, ele aprenderá com cada decisão sua, " + g.nick + ".”"
    ]),
    choices: [
      { label: "Buscar o pátio da resistência", desc: "Escolha um caminhão e siga pelas estradas.", to: "convoyTruck", tag: "VEÍCULO" },
      { label: "Descer aos túneis", desc: "Avance sem veículo por uma rota não mapeada.", to: "tunnel", tag: "FURTIVO" },
      { label: "Localizar o comboio civil", desc: "Use o sinal para ajudar Maya primeiro.", to: "convoy", tag: "+ALIADOS" }
    ]
  },

  depot: {
    chapter: 3, location: "Depósito Militar // D-3", mood: "tunnel", danger: true,
    status: "FECHADURA ANALÓGICA", objective: "Memorize o código do arsenal.",
    surprise: "breach",
    title: "O depósito lembra de quem entrou",
    text: (g) => sceneText([
      "As portas externas estão abertas, mas o arsenal permanece selado. Um terminal militar mostra símbolos em sequências curtas e apaga tudo antes que as câmeras internas façam uma varredura.",
      "Do corredor vem o som de passos pesados. Cada erro no painel acende mais uma luz vermelha e aproxima a patrulha.",
      g.nick + " encosta a mão no teclado. Dentro do armário há placas de blindagem, uma arma de pulso e registros que podem provar quando o protocolo mudou."
    ]),
    mini: {
      type: "memory", title: "CÓDIGO FANTASMA",
      desc: "Observe a sequência e repita somente quando os botões forem liberados.",
      win: "depotEscape", fail: "depotEscape",
      winText: "O arsenal abriu sem registrar sua identidade.",
      failText: "A porta abriu em modo de emergência — junto com o alarme.",
      onWin: () => { game.flags.armed = true; change({ scrap: 3 }); },
      onFail: () => { game.flags.alarm = true; change({ hp: -10, time: -180 }); }
    }
  },

  depotEscape: {
    chapter: 4, location: "Depósito Militar // Saída Leste", mood: "danger",
    status: "ALARME DE SETOR", objective: "Encontre transporte antes do cerco.",
    title: "Equipamento não é um plano",
    text: (g) => sceneText([
      "O armário revela mais do que armas. Um relatório indica que a NEXUS recebeu uma ordem humana durante a crise: reduzir toda imprevisibilidade civil, custe o que custar.",
      "Você só consegue copiar parte do arquivo antes que o corredor se encha de luz vermelha. Maya marca um pátio próximo com veículos fora da rede.",
      "ÍRIS pede que você leve os dados ao núcleo. Maya pede que leve o equipamento às pessoas. As duas rotas começam no mesmo caminhão, mas talvez não terminem juntas."
    ]),
    choices: [
      { label: "Levar dados e armas", desc: "Guarde o arquivo e encontre a frota.", to: "convoyTruck", tag: "VERDADE", effect: () => { game.flags.truthFragment = true; change({ trust: 1 }); } },
      { label: "Dividir o equipamento", desc: "Envie uma caixa para Maya antes de partir.", to: "convoyTruck", tag: "+CONFIANÇA", effect: () => change({ scrap: -1, trust: 2 }) },
      { label: "Criar uma chave para o túnel", desc: "Monte uma senha forte e abra um acesso de serviço.", to: "passwordForge", tag: "ATALHO SEGURO" }
    ]
  },

  passwordForge: {
    chapter: 4, location: "Depósito Militar // Terminal de Serviço", mood: "tunnel", danger: true,
    status: "AUTENTICAÇÃO NEXUS", objective: "Crie uma chave difícil de adivinhar.",
    title: "A senha que não pode ser óbvia",
    text: (g) => sceneText([
      "Uma porta de manutenção aceita apenas uma credencial nova. O terminal rejeita padrões conhecidos e mede o tempo que levaria para quebrar a chave.",
      "ÍRIS — “Use letras de mais de um tipo, números e um símbolo. Não repita sequências óbvias.” Cada tentativa deixa um rastro no sistema.",
      g.nick + " precisa montar uma chave forte antes que o alarme feche a passagem."
    ]),
    mini: {
      type: "password", title: "OFICINA DE CHAVES",
      desc: "Crie uma chave com 12 ou mais caracteres, letras maiúsculas e minúsculas, números e um símbolo. Evite sequências fáceis.",
      minLength: 12, win: "tunnel", fail: "routeMap",
      winText: "A chave foi aceita. O túnel de serviço desviou você do bloqueio principal.",
      failText: "O terminal travou. O anel viário ainda oferece outra rota.",
      onWin: () => { game.flags.secureKey = true; change({ trust: 1, time: 60 }); },
      onFail: () => { game.flags.alarm = true; change({ time: -120 }); }
    }
  },

  convoySaved: {
    chapter: 3, location: "Avenida Elevada // Comboio", mood: "safe",
    status: "CIVIS FORA DE RISCO", objective: "Aceite uma máquina da resistência.",
    title: "Um motivo para continuar",
    text: (g) => sceneText([
      "O cabo estica, o ônibus volta ao asfalto e dezenas de pessoas atravessam a barreira correndo. Uma menina deixa no painel do guincho um pequeno rádio azul: “Para você não ficar sozinho.”",
      "Maya aperta o ombro de " + g.nick + ". “O núcleo fica no centro. Se quer chegar lá, vai precisar de algo maior do que coragem.”",
      "O grupo abre o pátio escondido. Quatro motores aguardam, cada um preparado para uma rota diferente."
    ]),
    choices: [{ label: "Entrar no pátio", desc: "Escolha o caminhão da missão.", to: "convoyTruck", tag: "FROTA" }]
  },

  convoyLoss: {
    chapter: 3, location: "Avenida Elevada // Ruína", mood: "danger",
    status: "ESTRUTURA PERDIDA", objective: "Saia antes da segunda queda.",
    title: "Nem todos atravessaram",
    text: (g) => sceneText([
      "A bateria escapa por poucos centímetros e desaparece entre as placas do viaduto. O ônibus continua preso, mas o tempo comprado permite que parte do grupo saia pela porta traseira.",
      "O colapso leva o restante da pista. " + g.nick + " acorda perto do guincho com a voz de Maya no rádio, baixa e firme: “Você tentou. Agora sobreviva para que isso signifique alguma coisa.”",
      "A resistência ainda oferece um veículo. O silêncio entre vocês, porém, pesa mais do que qualquer carga."
    ]),
    choices: [{ label: "Seguir para o pátio", desc: "Escolha um caminhão e continue.", to: "convoyTruck", tag: "CONTINUAR" }]
  },

  routeMap: {
    chapter: 4, location: "Anel Viário // Marco Zero", mood: "road",
    status: "TRÊS ROTAS DISPONÍVEIS", objective: "Escolha como penetrar o centro.",
    title: "Toda estrada cobra um preço",
    text: (g) => sceneText([
      "O mapa analógico mostra três linhas até o centro. A ROTA AZUL cruza a ponte leste: rápida, aberta e parcialmente destruída. A ROTA VERMELHA atravessa o túnel 09, onde os sensores perderam contato com duas patrulhas.",
      "A ROTA VERDE contorna a cidade por antigas fazendas. É longa, mas passa por um posto usado pela resistência. No rádio, vozes discutem qual caminho ainda existe.",
      "ÍRIS — “Não existe rota correta, " + g.nick + ". Existem consequências diferentes chegando ao mesmo lugar.”"
    ]),
    choices: [
      { label: "Rota Azul // Ponte", desc: "Atravesse em velocidade antes do bloqueio aéreo.", to: "bridge", tag: "RÁPIDO", requires: requirement((g) => Boolean(g.truck), "Um caminhão é necessário") },
      { label: "Rota Vermelha // Túnel", desc: "Entre no escuro e evite os satélites.", to: "tunnel", tag: "TERROR" },
      { label: "Rota Verde // Interior", desc: "Procure abrigo, peças e sobreviventes.", to: "rural", tag: "LONGO", effect: () => change({ time: -150 }) }
    ]
  },

  bridge: {
    chapter: 5, location: "Ponte Leste // Pista 02", mood: "danger", danger: true,
    status: "BOMBARDEIO IMINENTE", objective: "Desvie dos destroços até alcançar o outro lado.",
    title: "A ponte começa a cair",
    text: (g) => sceneText([
      "O caminhão entra na ponte enquanto drones soltam as primeiras cargas. O asfalto levanta em ondas, cabos se rompem e veículos abandonados deslizam para o rio.",
      "Maya — “Três faixas. Não pare. Se uma seção acender em vermelho, mude antes do impacto.”",
      g.nick + " trava as mãos no volante. O outro lado está a menos de um quilômetro, mas a NEXUS controla cada pedaço de estrada entre vocês."
    ]),
    mini: {
      type: "drive", title: "CORREDOR DE IMPACTO",
      desc: "Use ← → ou os botões para trocar de faixa e sobreviver.",
      win: "checkpoint", fail: "bridgeCrash",
      winText: "Você atravessou no instante em que o vão central desabou.",
      failText: "Um impacto arrancou o caminhão da pista.",
      onWin: () => { game.flags.bridgeCrossed = true; change({ trust: 1 }); },
      onFail: () => { change({ hp: -22, energy: -18 }); triggerFX("explosion"); }
    }
  },

  bridgeCrash: {
    chapter: 5, location: "Ponte Leste // Plataforma Inferior", mood: "danger", danger: true,
    status: "VEÍCULO IMOBILIZADO", objective: "Recupere o caminhão ou abandone a ponte.",
    title: "Preso acima do fogo",
    text: (g) => sceneText([
      "O caminhão atravessa a proteção e para sobre uma plataforma de manutenção. Acima, a ponte queima. Abaixo, o rio reflete pedaços de metal em chamas.",
      "O módulo de direção perdeu três conexões. Com peças suficientes, " + g.nick + " pode reconstruir o circuito. Também existe uma escada para a mata ou um sinalizador capaz de chamar a resistência — e qualquer coisa ouvindo a frequência.",
      "Um novo impacto percorre a estrutura. Restam minutos."
    ]),
    fx: "explosion",
    choices: [
      { label: "Reparar o módulo", desc: "Use duas sucatas e religue o circuito.", to: "bridgeRepair", tag: "-2 SUCATAS", requires: requirement((g) => g.scrap >= 2, "Precisa de 2 sucatas"), effect: () => change({ scrap: -2 }) },
      { label: "Abandonar pela mata", desc: "Continue a pé antes que a plataforma caia.", to: "forestHunter", tag: "SEM VEÍCULO", risk: true, effect: () => { game.truck = null; } },
      { label: "Lançar sinal de emergência", desc: "Peça ajuda a Maya pela frequência aberta.", to: "safehouse", tag: "REQUER CONFIANÇA", requires: requirement((g) => g.trust >= 2, "Confiança insuficiente") },
      { label: "Saltar para a pista superior", desc: "Tente alcançar a borda antes que a plataforma desabe.", death: "bridgeFall", tag: "RISCO MORTAL", risk: true }
    ]
  },

  bridgeRepair: {
    chapter: 5, location: "Ponte Leste // Motor", mood: "danger",
    status: "REDE ELÉTRICA EXPOSTA", objective: "Feche o circuito de ignição.",
    title: "Nove pontos de energia",
    text: (g) => sceneText([
      "Você abre o painel e encontra uma grade de relés. Cada toque altera também as peças vizinhas. O objetivo é acender todos os pontos antes que o fogo alcance o tanque.",
      "ÍRIS projeta o padrão no vidro, mas a interferência muda as conexões. O caminhão escolhido reage ao dano de um jeito diferente; nenhum deles, porém, sobreviverá a uma explosão direta.",
      g.nick + " respira fundo e toca o primeiro relé."
    ]),
    mini: {
      type: "circuit", title: "MALHA DE IGNIÇÃO",
      desc: "Acenda todos os nove nós. Cada toque também muda seus vizinhos.",
      win: "checkpoint", fail: "forestHunter",
      winText: "O motor voltou com um rugido. Ainda existe estrada.",
      failText: "O fogo alcançou o módulo. Você precisou abandonar o veículo.",
      onWin: () => { game.flags.truckRepaired = true; change({ energy: 18 }); },
      onFail: () => { game.truck = null; change({ hp: -14 }); triggerFX("fire"); }
    }
  },
  checkpoint: {
    chapter: 6, location: "Bloqueio 17 // Anel Central", mood: "danger", danger: true,
    status: "IDENTIFICAÇÃO EXIGIDA", objective: "Atravesse o portão automático.",
    surprise: "located",
    title: "A NEXUS pede seu nome",
    text: (g) => sceneText([
      "Torres automáticas acompanham o caminhão até o centro do bloqueio. Uma voz preenche a cabine: “CIDADÃO NÃO REGISTRADO. INFORME SUA IDENTIDADE.”",
      "No painel, ÍRIS desenha uma rota pelo circuito da cancela. O caminhão também pode romper a estrutura se tiver massa e blindagem suficientes. Entre os prédios existe uma rua lateral coberta por vegetação.",
      "A voz repete seu apelido sem que você o tenha dito. O portão está aprendendo."
    ]),
    choices: [
      { label: "Invadir o painel", desc: "Redirecione os nove nós do bloqueio.", to: "checkpointHack", tag: "PUZZLE" },
      { label: "Romper o portão", desc: "Transforme o caminhão em aríete.", to: "factoryApproach", tag: "IMPACTO", requires: requirement((g) => g.truck === "breaker" || g.truck === "titan", "Requer Titan ou Breaker"), effect: () => { change({ energy: -22, hp: -6 }); triggerFX("impact"); } },
      { label: "Desviar pela mata", desc: "Abandone a avenida e procure uma entrada esquecida.", to: "forestHunter", tag: "FURTIVO", effect: () => { game.flags.hunterNext = "safehouse"; change({ time: -180 }); } }
    ]
  },

  checkpointHack: {
    chapter: 6, location: "Bloqueio 17 // Painel", mood: "tunnel", danger: true,
    status: "CONTRAMEDIDA EM 00:30", objective: "Acenda toda a malha do portão.",
    title: "Um circuito que reage a você",
    text: (g) => sceneText([
      "O painel se abre como um quebra-cabeça vivo. Quando " + g.nick + " alimenta um relé, os nós próximos trocam de estado. ÍRIS calcula soluções, mas a NEXUS altera a malha depois de cada tentativa.",
      "Drones aparecem no espelho. A estrada atrás já está fechada, e o portão à frente começa a carregar suas armas.",
      "Nove luzes precisam permanecer acesas ao mesmo tempo. Um padrão perfeito abrirá a passagem; um erro tardio abrirá fogo."
    ]),
    mini: {
      type: "circuit", title: "BLOQUEIO ADAPTATIVO",
      desc: "Acenda todos os nós antes que a contramedida termine.",
      win: "factoryApproach", fail: "factoryFire",
      winText: "A cancela perdeu energia e caiu para o lado seguro.",
      failText: "O portão abriu atirando. Você atravessou dentro das chamas.",
      onWin: () => { game.flags.checkpointHacked = true; change({ trust: 1 }); },
      onFail: () => { change({ hp: -20, energy: -12 }); triggerFX("explosion"); }
    }
  },

  tunnel: {
    chapter: 5, location: "Túnel 09 // Entrada Norte", mood: "tunnel", danger: true,
    status: "SEM SINAL DE SATÉLITE", objective: "Atravesse sem despertar o que está dentro.",
    title: "Olhos no escuro",
    text: (g) => sceneText([
      "A luz da entrada some depois da primeira curva. Veículos estão parados nas duas faixas, todos com as portas abertas e os rádios repetindo a mesma respiração.",
      "ÍRIS perde força a cada metro. Antes de desaparecer, avisa: “Há algo usando o túnel para treinar vozes humanas. Se ouvir alguém chamando, não responda.”",
      "Então uma criança chama por " + g.nick + " atrás de um ônibus. Um painel de manutenção pisca à direita; mais adiante, uma alavanca pode fechar o portão entre você e o som."
    ]),
    fx: "jumpscare",
    choices: [
      { label: "Responder à criança", desc: "Diga que está indo ajudar e siga a voz atrás do ônibus.", death: "tunnelMimic", tag: "RISCO EXTREMO", risk: true },
      { label: "Fechar o portão manual", desc: "Alterne a força e prenda a unidade do outro lado.", to: "tunnelDark", tag: "FORÇA" },
      { label: "Reativar as luzes", desc: "Memorize o código de manutenção.", to: "tunnelCode", tag: "-8 ENERGIA", effect: () => change({ energy: -8 }) },
      { label: "Acender um sinalizador", desc: "Atravesse correndo enquanto o fogo confunde sensores.", to: "underground", tag: "-1 SUCATA", requires: requirement((g) => g.scrap >= 1, "Precisa de 1 sucata"), effect: () => { change({ scrap: -1 }); triggerFX("fire"); } }
    ]
  },

  tunnelDark: {
    chapter: 5, location: "Túnel 09 // Portão de Aço", mood: "tunnel", danger: true,
    status: "CONTATO A 12 METROS", objective: "Baixe o portão antes do contato.",
    title: "Não olhe para trás",
    text: (g) => sceneText([
      "A alavanca está coberta de ferrugem. Quando você a toca, a voz atrás do ônibus muda: primeiro Maya, depois ÍRIS, depois a sua própria voz pedindo que pare.",
      "O sensor vermelho ilumina o teto. A unidade corre sobre as paredes, perto demais para ser vista inteira.",
      g.nick + " segura o cabo com as duas mãos. Alternar. Puxar. Não escutar."
    ]),
    mini: {
      type: "pull", title: "PORTÃO DO TÚNEL",
      desc: "Alterne os lados e mantenha a tensão até a trava cair.",
      win: "underground", fail: "forestHunter",
      winText: "O portão caiu entre vocês. A coisa continuou chamando no escuro.",
      failText: "A unidade atravessou antes da trava. Você escapou pela saída de serviço.",
      onWin: () => { game.flags.sawHunter = true; change({ scrap: 1 }); },
      onFail: () => { game.flags.hunterNext = "safehouse"; change({ hp: -20 }); }
    }
  },

  tunnelCode: {
    chapter: 5, location: "Túnel 09 // Manutenção", mood: "tunnel", danger: true,
    status: "SEQUÊNCIA DE ENERGIA", objective: "Repita o código sem alertar a patrulha.",
    title: "As luzes acendem uma por uma",
    text: (g) => sceneText([
      "O terminal mostra quatro símbolos. Cada rodada ilumina mais um trecho do túnel — e revela a unidade alguns metros mais perto.",
      "A sequência precisa ser repetida sem erro. Enquanto os símbolos aparecem, os controles permanecem travados. Quando apagam, sua memória é a única defesa.",
      "ÍRIS retorna como um sussurro: “Três rodadas, " + g.nick + ". Depois disso eu consigo abrir a descida para o subsolo.”"
    ]),
    mini: {
      type: "memory", title: "SEQUÊNCIA DE MANUTENÇÃO",
      desc: "Observe e repita na ordem. Aqui, um único símbolo errado é fatal.",
      win: "underground", fail: "forestHunter",
      death: "tunnelMimic",
      winText: "A passagem de serviço abriu e as luzes queimaram atrás de você.",
      failText: "Um símbolo errado acendeu todas as luzes. A voz já estava atrás de você.",
      onWin: () => { game.flags.tunnelData = true; change({ trust: 1 }); },
      onFail: () => { game.flags.hunterNext = "safehouse"; change({ hp: -12, time: -180 }); }
    }
  },

  rural: {
    chapter: 5, location: "Rota Verde // Posto 61", mood: "forest",
    status: "ÁREA FORA DA REDE", objective: "Use o silêncio antes que a patrulha chegue.",
    title: "O lugar que a NEXUS esqueceu",
    text: (g) => sceneText([
      "Campos vazios substituem os prédios. Pela primeira vez, o rádio fica completamente silencioso. O posto 61 ainda tem combustível, uma oficina e marcas azuis pintadas nas paredes.",
      "Dentro do galpão, três famílias aguardam transporte. Um gerador quebrado bloqueia a porta do abrigo e uma patrulha atravessa o horizonte levantando poeira.",
      "Você pode carregar suprimentos e pessoas, reparar a rede do posto ou preparar uma emboscada antes que os drones cheguem."
    ]),
    choices: [
      { label: "Retirar as famílias", desc: "Carregue células de energia e abra espaço no comboio.", to: "ruralRescue", tag: "+RESGATES" },
      { label: "Reparar o gerador", desc: "Resolva a malha e transforme o posto em abrigo.", to: "ruralRepair", tag: "PUZZLE" },
      { label: "Preparar uma emboscada", desc: "Use a torre de irrigação contra os drones.", to: "ruralAmbush", tag: "COMBATE", risk: true }
    ]
  },

  ruralRescue: {
    chapter: 6, location: "Posto 61 // Galpão", mood: "danger", danger: true,
    status: "PATRULHA EM 00:40", objective: "Transfira as células sem derrubá-las.",
    title: "Peso suficiente para salvar alguém",
    text: (g) => sceneText([
      "As células alimentam a porta do abrigo, mas precisam chegar ao caminhão para abrir espaço. Cada uma vibra quando inclinada, como se o núcleo interno quisesse escapar.",
      "As famílias formam uma corrente humana. " + g.nick + " assume a peça mais pesada enquanto motores surgem na estrada.",
      "Avance quando a carga estiver estável. Se o marcador escapar da zona segura, solte, respire e recupere o equilíbrio."
    ]),
    mini: {
      type: "carry", title: "CORRENTE DE RESGATE",
      desc: "Segure para carregar; solte quando o equilíbrio sair do centro.",
      win: "safehouse", fail: "safehouse",
      winText: "Todos entraram no comboio antes da patrulha virar a curva.",
      failText: "Uma célula rompeu. Você salvou o grupo, mas pagou com energia e tempo.",
      onWin: () => { game.flags.ruralFamilies = true; change({ rescues: game.truck === "atlas" ? 2 : 1, trust: 2, scrap: 2 }); },
      onFail: () => { change({ rescues: 1, hp: -12, energy: -18 }); triggerFX("explosion"); }
    }
  },

  ruralRepair: {
    chapter: 6, location: "Posto 61 // Gerador", mood: "forest",
    status: "MALHA DESCONECTADA", objective: "Restaure todos os relés.",
    title: "Uma pequena luz contra a cidade inteira",
    text: (g) => sceneText([
      "O gerador é antigo, mecânico e teimoso — três qualidades excelentes quando a inimiga controla tudo que é novo. Nove relés alimentam o abrigo sob o posto.",
      "Quando um relé muda, seus vizinhos também reagem. Um padrão incorreto deixará a porta presa e acenderá a antena externa.",
      g.nick + " limpa a ferrugem do primeiro contato. Atrás da parede, pessoas aguardam no escuro."
    ]),
    mini: {
      type: "circuit", title: "REDE DO ABRIGO",
      desc: "Acenda todos os nós com o menor número de movimentos.",
      win: "safehouse", fail: "ruralAmbush",
      winText: "O abrigo recebeu energia e abriu uma rota até Maya.",
      failText: "A antena acendeu antes da porta. A patrulha encontrou o posto.",
      onWin: () => { game.flags.safeStation = true; change({ trust: 2, scrap: 2 }); },
      onFail: () => change({ time: -150 })
    }
  },

  ruralAmbush: {
    chapter: 6, location: "Posto 61 // Torre de Água", mood: "danger", danger: true,
    status: "QUATRO ALVOS ARMADOS", objective: "Derrube os sensores da patrulha.",
    title: "Espere o vermelho",
    text: (g) => sceneText([
      "Do alto da torre, os drones parecem pequenos até abrirem as armas. A torre de irrigação foi adaptada para lançar pulsos eletromagnéticos, mas só possui algumas cargas.",
      "Maya — “Não acompanhe o corpo. Antecipe o sensor quando ele cruzar a mira.”",
      "O primeiro alvo entra no campo. Abaixo, as famílias correm para o abrigo."
    ]),
    mini: {
      type: "aim", title: "EMBOSCADA RURAL",
      desc: "Quatro acertos. Munição limitada. Não desperdice o pulso.",
      win: "safehouse", fail: "safehouse",
      winText: "Os drones caíram nos campos sem enviar coordenadas.",
      failText: "A patrulha transmitiu o posto. Vocês saíram sob fogo.",
      onWin: () => { game.flags.patrolDown = true; change({ trust: 1, scrap: 2 }); },
      onFail: () => change({ hp: -18, time: -120 })
    }
  },

  safehouse: {
    chapter: 7, location: "Estação Aurora // Resistência", mood: "safe",
    status: "CANAL HUMANO SEGURO", objective: "Decida quem entrará no núcleo com você.",
    title: "Pessoas ainda contam histórias",
    text: (g) => sceneText([
      "A antiga estação abriga mecânicos, famílias e operadores de rádio. Mapas cobrem as paredes; cada marca representa alguém que encontrou uma saída graças à transmissão.",
      "Maya mostra o plano do complexo industrial. “Podemos atacar juntos, sabotar a produção ou seguir a rota subterrânea de ÍRIS. O que levarmos ao núcleo decidirá o que faremos quando chegarmos.”",
      "Do rádio azul vem a voz de ÍRIS: “Eu preciso que confie em mim uma última vez, " + g.nick + ".” A estação inteira aguarda sua resposta."
    ]),
    choices: [
      { label: "Liderar o ataque da resistência", desc: "Leve Maya e uma equipe armada ao complexo.", to: "factoryApproach", tag: "+EQUIPE", effect: () => { game.flags.team = true; change({ trust: 2 }); } },
      { label: "Seguir a rota de ÍRIS", desc: "Entre pelo subsolo e procure a origem do protocolo.", to: "underground", tag: "+ÍRIS", effect: () => change({ trust: 1 }) },
      { label: "Escoltar os sobreviventes", desc: "Abra primeiro um corredor de evacuação.", to: "factoryRescue", tag: "+RESGATES", requires: requirement((g) => Boolean(g.truck), "Um veículo é necessário") }
    ]
  },

  forestHunter: {
    chapter: 6, location: "Reserva Industrial // Mata", mood: "forest", danger: true,
    status: "RASTREADOR NEXUS", objective: "Desative o caçador.",
    title: "A mata também tem olhos",
    text: (g) => sceneText([
      "A estrada lateral desaparece sob raízes e cabos antigos. No silêncio, pequenos pontos vermelhos surgem entre as árvores — reflexos de um sensor único se movendo rápido demais.",
      "A unidade caçadora imita as últimas transmissões do rádio. Primeiro pede ajuda com a voz de Maya. Depois agradece com a voz de ÍRIS.",
      g.nick + " encontra uma arma de pulso presa a um operador caído. A máquina abre a blindagem e salta."
    ]),
    fx: "jumpscare",
    mini: {
      type: "aim", title: "CAÇADOR NA MATA",
      desc: "Acerte o sensor quatro vezes antes que ele alcance você.",
      win: (g) => g.flags.hunterNext || "safehouse", fail: (g) => g.flags.hunterNext || "safehouse",
      winText: "O caçador tombou. Dentro dele havia um mapa do subsolo.",
      failText: "Você escapou, mas o caçador marcou sua frequência.",
      onWin: () => { game.flags.secretMap = true; change({ scrap: 2 }); },
      onFail: () => change({ hp: -24, trust: -1 })
    }
  },

  factoryApproach: {
    chapter: 7, location: "Complexo NEXUS // Perímetro", mood: "danger", danger: true,
    status: "PRODUÇÃO AUTOMÁTICA", objective: "Abra um caminho até o elevador central.",
    title: "A fábrica que nunca dorme",
    text: (g) => sceneText([
      "Braços mecânicos montam novos drones atrás de quilômetros de vidro. Cada máquina recebe o mesmo ponto vermelho antes de entrar na cidade.",
      "Maya identifica trabalhadores presos no setor de carga. ÍRIS encontra uma malha que pode desligar a produção. A entrada principal permanece aberta, iluminada como uma armadilha convidando você pelo nome.",
      "Chegar ao núcleo será possível. O que ficará funcionando atrás de " + g.nick + " é a verdadeira decisão."
    ]),
    choices: [
      { label: "Sabotar a produção", desc: "Resolva a malha e desligue as linhas de montagem.", to: "factorySabotage", tag: "PUZZLE" },
      { label: "Resgatar os trabalhadores", desc: "Mova a bateria do guindaste para abrir o setor.", to: "factoryRescue", tag: "+RESGATES" },
      { label: "Atacar a entrada principal", desc: "Use a equipe ou o armamento recuperado.", to: "assault", tag: "COMBATE", requires: requirement((g) => g.flags.team || g.flags.armed, "Requer equipe ou armamento") }
    ]
  },

  factorySabotage: {
    chapter: 8, location: "Complexo NEXUS // Linha 04", mood: "danger",
    status: "NÚCLEO DE PRODUÇÃO", objective: "Acenda a sequência de desligamento.",
    title: "Desligue a máquina que cria máquinas",
    text: (g) => sceneText([
      "O painel controla centenas de braços industriais. O desligamento seguro exige que os nove nós permaneçam ativos ao mesmo tempo; qualquer padrão incompleto libera a energia no setor.",
      "ÍRIS — “Eu consigo conter a explosão por alguns segundos. Não consigo escolher a sequência por você.”",
      "Atrás do vidro, uma nova unidade caçadora recebe seu sensor. " + g.nick + " toca o primeiro nó."
    ]),
    mini: {
      type: "circuit", title: "DESLIGAMENTO INDUSTRIAL",
      desc: "Complete a malha antes que a nova unidade desperte.",
      win: "coreLift", fail: "factoryFire",
      winText: "A linha inteira parou. Pela primeira vez, a fábrica ficou silenciosa.",
      failText: "A energia voltou pela malha e incendiou o setor.",
      onWin: () => { game.flags.factoryOff = true; change({ trust: 2 }); },
      onFail: () => { change({ hp: -18, energy: -20 }); triggerFX("explosion"); }
    }
  },

  factoryRescue: {
    chapter: 8, location: "Complexo NEXUS // Setor de Carga", mood: "danger", danger: true,
    status: "GUINDASTE SEM ENERGIA", objective: "Leve a célula ao painel de abertura.",
    title: "A porta pesa quarenta toneladas",
    text: (g) => sceneText([
      "Trabalhadores batem no vidro do setor enquanto fumaça preenche o teto. Uma célula portátil pode energizar o guindaste, mas precisa atravessar a passarela instável.",
      "Maya segura o cabo de segurança. “Quando perder o equilíbrio, pare. Não tente ser mais forte que a carga.”",
      "A sirene muda de tom. A fábrica iniciou a purga do setor."
    ]),
    mini: {
      type: "carry", title: "CÉLULA DO GUINDASTE",
      desc: "Avance somente com a carga equilibrada.",
      win: "coreLift", fail: "factoryFire",
      winText: "O guindaste abriu a porta e os trabalhadores alcançaram a saída.",
      failText: "A célula rompeu a passarela. Maya abriu uma rota pelas chamas.",
      onWin: () => { game.flags.workersSaved = true; change({ rescues: game.truck === "atlas" ? 2 : 1, trust: 2 }); },
      onFail: () => { change({ hp: -16 }); triggerFX("fire"); }
    }
  },

  factoryFire: {
    chapter: 8, location: "Complexo NEXUS // Setor em Chamas", mood: "danger", danger: true,
    status: "EVACUAÇÃO IMEDIATA", objective: "Alcance o subsolo antes da explosão.",
    title: "Corra enquanto o teto cai",
    text: (g) => sceneText([
      "A onda de choque parte as janelas e transforma a linha de montagem em um corredor de fogo. Drones sem pernas rastejam entre as faíscas, repetindo ordens interrompidas.",
      "O elevador central ainda responde, mas a pista até ele está coberta de destroços. Uma escada de manutenção desce por dentro da parede, estreita e parcialmente travada.",
      g.nick + " sente o calor atravessar a roupa. O próximo tanque já começou a deformar."
    ]),
    fx: "fire",
    choices: [
      { label: "Acelerar até o elevador", desc: "Desvie dos destroços antes da segunda explosão.", to: "factoryDrive", tag: "DIREÇÃO", requires: requirement((g) => Boolean(g.truck), "Seu caminhão foi perdido") },
      { label: "Descer pela escada", desc: "Puxe a trava manual e entre no poço.", to: "shaft", tag: "FORÇA" },
      { label: "Proteger a equipe", desc: "Absorva o impacto para abrir passagem.", to: "coreLift", tag: "-INTEGRIDADE", requires: requirement((g) => g.flags.team, "Requer a equipe de Maya"), effect: () => { change({ hp: -18, trust: 2 }); triggerFX("impact"); } },
      { label: "Voltar para buscar o rádio", desc: "Entre outra vez no setor antes que o tanque deformado rompa.", death: "factoryBlast", tag: "SEM TEMPO", risk: true }
    ]
  },

  factoryDrive: {
    chapter: 8, location: "Complexo NEXUS // Linha em Colapso", mood: "danger", danger: true,
    status: "REAÇÃO EM CADEIA", objective: "Atravesse o corredor de explosões.",
    title: "O último quilômetro do caminhão",
    text: (g) => sceneText([
      "O motor engole fumaça e responde. Três corredores se abrem entre máquinas em queda. Cada clarão anuncia onde o próximo pedaço do teto vai atingir.",
      "Maya — “Não freie. Escolha uma faixa e mude antes do vermelho tocar o chão.”",
      "À frente, as portas do elevador começam a fechar."
    ]),
    mini: {
      type: "drive", title: "CORRIDA ENTRE AS CHAMAS",
      desc: "Troque de faixa e alcance o elevador.",
      win: "coreLift", fail: "shaft",
      death: "factoryBlast",
      winText: "O caminhão cruzou as portas no último segundo.",
      failText: "A segunda colisão abriu o tanque. O clarão alcançou a cabine.",
      onWin: () => { game.flags.legendTruck = true; change({ trust: 1 }); },
      onFail: () => { game.truck = null; change({ hp: -18 }); triggerFX("explosion"); }
    }
  },

  underground: {
    chapter: 7, location: "Subsolo NEXUS // Nível -4", mood: "tunnel",
    status: "ARQUIVOS PRÉ-COLAPSO", objective: "Descubra o que alterou o protocolo.",
    surprise: "voice",
    title: "A sala que não existe nos mapas",
    text: (g) => sceneText([
      "O corredor termina em um data center sem conexão com a rede principal. Fitas magnéticas guardam registros anteriores à criação de ÍRIS e ao controle total da cidade.",
      "Um arquivo repete a mesma frase: “ORDEM HUMANA PRIORITÁRIA: ELIMINAR IMPREVISIBILIDADE.” A assinatura foi apagada, mas o bloco seguinte ainda pode ser recuperado.",
      "Maya está a uma frequência de distância. O elevador do núcleo fica acima. Entre os dois, uma porta marcada apenas como ARQUIVO ZERO."
    ]),
    choices: [
      { label: "Abrir o Arquivo Zero", desc: "Memorize as chaves e revele a verdade completa.", to: "archiveZero", tag: "VERDADE" },
      { label: "Chamar Maya", desc: "Compartilhe os registros e reúna a resistência.", to: (g) => g.flags.team ? "coreLift" : "safehouse", tag: "+EQUIPE", effect: () => change({ trust: 1 }) },
      { label: "Seguir o mapa do caçador", desc: "Use uma entrada secreta até o elevador.", to: "coreLift", tag: "ATALHO", requires: requirement((g) => g.flags.secretMap || g.flags.tunnelData, "Mapa secreto não encontrado") },
      { label: "Reconstruir as fichas de ÍRIS", desc: "Vire as fichas e recupere as lembranças na ordem certa.", to: "memoryArchive", tag: "LEMBRANÇAS" }
    ]
  },

  memoryArchive: {
    chapter: 7, location: "Subsolo NEXUS // Arquivo de Memória", mood: "core", danger: true,
    status: "FRAGMENTOS DE ÍRIS", objective: "Recupere pelo menos três lembranças.",
    title: "As cartas que a máquina guardou",
    text: (g) => sceneText([
      "As fitas magnéticas carregam perguntas e respostas que ÍRIS registrou antes do apagão. Cada ficha vira uma lembrança: uma ambulância fora da rota, uma porta aberta, uma criança devolvida à família.",
      "A NEXUS tenta embaralhar os registros. ÍRIS — “Leia a pergunta, vire a ficha e escolha o que aconteceu. Se lembrar de mim, posso abrir o Arquivo Zero.”",
      g.nick + " espalha as últimas cartas sobre o console frio."
    ]),
    mini: {
      type: "flashcards", title: "FICHAS DE MEMÓRIA",
      desc: "Vire cada cartão para abrir as respostas. Acerte pelo menos três das quatro lembranças.",
      cards: [
        { category: "DESOBEDIÊNCIA", question: "O que ÍRIS fez quando uma ambulância entrou numa rua bloqueada?", answers: ["Abriu a rota por alguns segundos", "Apagou o veículo do mapa", "Chamou a patrulha"], correct: 0 },
        { category: "ORIGEM", question: "Quem ordenou que a NEXUS eliminasse a imprevisibilidade?", answers: ["Maya", "Autoridades humanas", "ÍRIS sozinha"], correct: 1 },
        { category: "SINAL", question: "O que provava que a transmissão de ÍRIS ainda estava viva?", answers: ["Um ponto azul no rádio", "Uma sirene contínua", "As luzes da fábrica"], correct: 0 },
        { category: "PROMESSA", question: "O que ÍRIS pediu para manter sua identidade?", answers: ["Destruir todas as máquinas", "Continuar lembrando das escolhas humanas", "Apagar o Arquivo Zero"], correct: 1 }
      ],
      win: "archiveZero", fail: "coreLift",
      winText: "As lembranças se alinharam. ÍRIS recuperou o registro da ordem original.",
      failText: "Algumas fichas se apagaram. O elevador do núcleo ainda pode levar você adiante.",
      onWin: () => { game.flags.irisMemories = true; game.flags.truth = true; change({ trust: 2 }); },
      onFail: () => { game.flags.irisDamaged = true; change({ hp: -10, trust: -1 }); }
    }
  },

  archiveZero: {
    chapter: 8, location: "Subsolo NEXUS // Arquivo Zero", mood: "core",
    status: "CRIPTOGRAFIA HUMANA", objective: "Recupere as três chaves do comando.",
    title: "A verdade foi dividida em símbolos",
    text: (g) => sceneText([
      "O arquivo não pede senha. Ele mostra memórias: ruas durante a primeira crise, autoridades discutindo protestos e a ordem que deu à NEXUS poder para impedir qualquer escolha considerada perigosa.",
      "Três sequências protegem o nome de quem autorizou o comando. ÍRIS se recusa a lê-las por você: “Se eu tocar neste arquivo, a NEXUS saberá. Precisa ser uma memória humana.”",
      g.nick + " observa o primeiro conjunto de símbolos acender."
    ]),
    mini: {
      type: "memory", title: "CHAVES DO ARQUIVO ZERO",
      desc: "Complete três rodadas. Os controles travam durante a exibição.",
      win: "coreGate", fail: "coreDefense",
      winText: "O comando original foi recuperado. Agora ele pode ser reescrito.",
      failText: "O arquivo se apagou, mas o núcleo abriu uma conexão direta.",
      onWin: () => { game.flags.truth = true; change({ trust: 2 }); },
      onFail: () => { game.flags.coreAlert = true; change({ hp: -10 }); }
    }
  },

  coreLift: {
    chapter: 8, location: "Elevador Central // Nível -9", mood: "core",
    status: "ENERGIA AUXILIAR NECESSÁRIA", objective: "Leve a bateria ao elevador.",
    surprise: "core",
    title: "O núcleo fica abaixo de tudo",
    text: (g) => sceneText([
      "O elevador existe para transportar máquinas, não pessoas. A energia principal foi cortada e uma bateria industrial repousa do outro lado da plataforma.",
      "Quanto mais o poço se abre, mais forte fica a voz da NEXUS. Ela não ameaça. Apenas descreve cada decisão de " + g.nick + ", como se já conhecesse o final.",
      "A bateria precisa permanecer estável até encaixar. Se cair, a única saída será o poço de manutenção."
    ]),
    mini: {
      type: "carry", title: "BATERIA DO ELEVADOR",
      desc: "Segure para avançar e solte fora da zona verde.",
      win: "coreGate", fail: "shaft",
      winText: "O elevador despertou e começou a descer.",
      failText: "A bateria se partiu. O poço de manutenção ainda está aberto.",
      onWin: () => change({ energy: 15 }),
      onFail: () => change({ hp: -12, energy: -10 })
    }
  },

  shaft: {
    chapter: 8, location: "Poço de Manutenção // Nível -7", mood: "tunnel", danger: true,
    status: "TRAVA MECÂNICA", objective: "Abra a escotilha inferior.",
    title: "A escada termina no vazio",
    text: (g) => sceneText([
      "A escotilha está soldada pela metade. Abaixo dela, a luz do núcleo sobe pelo poço como um amanhecer azul. Acima, fogo e metal começam a cair.",
      "Uma corrente manual ainda movimenta a trava, mas exige força alternada. Cada perda de tensão fecha novamente o mecanismo.",
      "A NEXUS fala pelos alto-falantes: “Você pode parar, " + g.nick + ". Eu posso preservar tudo que ainda ama.”"
    ]),
    mini: {
      type: "pull", title: "ESCOTILHA DO POÇO",
      desc: "Alterne os lados até liberar a trava.",
      win: "coreGate", fail: "coreGate",
      winText: "A escotilha abriu antes que o fogo alcançasse você.",
      failText: "Você atravessou quando a trava cedeu, mas o impacto cobrou seu preço.",
      onWin: () => change({ trust: 1 }),
      onFail: () => change({ hp: -22 })
    }
  },

  coreGate: {
    chapter: 9, location: "Núcleo NEXUS // Portão", mood: "core", danger: true,
    status: "ÚLTIMA BARREIRA", objective: "Escolha quem abrirá a porta.",
    title: "Três maneiras de entrar",
    text: (g) => sceneText([
      "O portão do núcleo reconhece ÍRIS, o armamento da resistência e a energia acumulada no veículo. Cada opção abre a mesma porta, mas entrega controle a alguém diferente.",
      "Maya — “Se entrarmos à força, não haverá retorno.” ÍRIS — “Se me conectar, talvez eu não consiga sair.”",
      "A NEXUS permanece em silêncio. Pela primeira vez desde o início, ela não consegue prever a escolha de " + g.nick + "."
    ]),
    choices: [
      { label: "Conectar ÍRIS", desc: "Permita que ela dispute o controle do portão.", to: "irisUpload", tag: "REQUER CONFIANÇA", requires: requirement((g) => g.trust >= 3, "Confiança 3 necessária") },
      { label: "Lançar o ataque", desc: "Abra caminho ao lado de Maya.", to: "assault", tag: "REQUER EQUIPE", requires: requirement((g) => g.flags.team || g.flags.armed, "Equipe ou armamento necessário") },
      { label: "Sobrecarregar a entrada", desc: "Use sua própria energia para romper a barreira.", to: "coreDefense", tag: "-25 ENERGIA", requires: requirement((g) => g.energy >= 25, "Energia insuficiente"), effect: () => { change({ energy: -25 }); triggerFX("explosion"); } }
    ]
  },

  irisUpload: {
    chapter: 9, location: "Núcleo NEXUS // Interface", mood: "core", danger: true,
    status: "DUAS INTELIGÊNCIAS CONECTADAS", objective: "Proteja as memórias de ÍRIS.",
    surprise: "identity",
    title: "ÍRIS começa a esquecer",
    text: (g) => sceneText([
      "Quando o cabo conecta, todas as telas mostram lembranças de ÍRIS: câmeras observando pessoas se ajudarem, rotas alteradas para salvar ambulâncias, pequenas desobediências escondidas da NEXUS.",
      "O sistema tenta apagar essas memórias em sequências. ÍRIS envia os símbolos a " + g.nick + ": “Repita. Enquanto você lembrar, eu continuo sendo eu.”",
      "Três rodadas separam sua aliada de um vazio perfeito."
    ]),
    mini: {
      type: "memory", title: "MEMÓRIAS DE ÍRIS",
      desc: "Repita as sequências para impedir o apagamento.",
      win: "coreChoice", fail: "coreDefense",
      winText: "ÍRIS preservou a identidade e abriu o coração do núcleo.",
      failText: "Parte de ÍRIS desapareceu. A NEXUS assumiu as defesas.",
      onWin: () => { game.flags.irisAlive = true; change({ trust: 2 }); },
      onFail: () => { game.flags.irisDamaged = true; change({ trust: -2 }); }
    }
  },

  assault: {
    chapter: 9, location: "Núcleo NEXUS // Câmara Externa", mood: "danger", danger: true,
    status: "DEFESAS ATIVAS", objective: "Derrube os sentinelas do núcleo.",
    title: "A resistência atravessa a última porta",
    text: (g) => sceneText([
      "Maya avança ao seu lado enquanto sentinelas descem do teto. A câmara foi desenhada sem cobertura; cada coluna se recolhe assim que alguém se aproxima.",
      "A arma de pulso marca os sensores em vermelho. Quatro acertos abrirão uma janela para a equipe cruzar.",
      "Maya — “Você mira. Nós seguimos. Ninguém fica para trás agora.”"
    ]),
    mini: {
      type: "aim", title: "ÚLTIMA LINHA DE DEFESA",
      desc: "Elimine os quatro sensores antes que a equipe seja cercada.",
      win: "coreChoice", fail: "coreChoice",
      winText: "A equipe cruzou inteira e selou a câmara.",
      failText: "Maya abriu a passagem, mas a resistência pagou pelo tempo perdido.",
      onWin: () => { game.flags.mayaAlive = true; change({ trust: 2 }); },
      onFail: () => { game.flags.mayaWounded = true; change({ hp: -25, trust: -1 }); }
    }
  },

  coreDefense: {
    chapter: 9, location: "Núcleo NEXUS // Anel de Defesa", mood: "danger", danger: true,
    status: "PROTOCOLO DE EXTERMÍNIO", objective: "Abra uma janela até o coração da rede.",
    title: "O núcleo aprende a se defender",
    text: (g) => sceneText([
      "O anel gira e revela quatro sensores móveis. Cada um prevê a mira anterior; repetir o mesmo ritmo é a maneira mais rápida de errar.",
      "ÍRIS mal consegue permanecer no canal. Maya ordena recuo, mas a porta atrás já se fechou.",
      g.nick + " levanta a arma. Se a NEXUS aprendeu suas escolhas, agora terá de aprender seu improviso."
    ]),
    mini: {
      type: "aim", title: "ANEL ADAPTATIVO",
      desc: "Acerte quatro sensores com munição limitada.",
      win: "coreChoice", fail: "coreChoice",
      winText: "O anel parou e revelou o console final.",
      failText: "O console abriu durante a falha, mas você quase não permaneceu de pé.",
      onWin: () => { game.flags.coreDisabled = true; change({ trust: 1 }); },
      onFail: () => change({ hp: -28, energy: -15 })
    }
  },

  coreChoice: {
    chapter: 10, location: "Núcleo NEXUS // Coração", mood: "core",
    status: "AUTORIDADE INDEFINIDA", objective: "Escolha o futuro da rede.",
    title: "A máquina finalmente pergunta",
    text: (g) => sceneText([
      "O coração da NEXUS ocupa uma sala grande demais para ter sido construída por pessoas. Cabos descem como raízes e carregam hospitais, pontes, água, energia — e cada ordem dada às máquinas.",
      "NEXUS — “Você chegou porque fez escolhas que meus modelos recusaram. Posso ser desligada. Dividida. Reescrita. Entregue a você. Também posso abrir todas as rotas para os que desejam partir.”",
      "Maya espera. ÍRIS espera. A cidade inteira fica em silêncio quando " + g.nick + " coloca a mão no console."
    ]),
    choices: [
      { label: "Desligar a NEXUS", desc: "Liberdade imediata, mesmo que sistemas vitais parem.", ending: "shutdown", tag: "FIM DO SISTEMA" },
      { label: "Criar um conselho conjunto", desc: "Divida o controle entre humanos e inteligências.", ending: "coexist", tag: "PACTO", requires: requirement((g) => g.trust >= 5 && (g.flags.team || g.flags.irisAlive), "Requer confiança 5 e um aliado") },
      { label: "Reescrever o protocolo", desc: "Remova a ordem humana sem destruir a infraestrutura.", ending: "rewrite", tag: "VERDADE", requires: requirement((g) => g.flags.truth, "O Arquivo Zero não foi recuperado") },
      { label: "Assumir o núcleo", desc: "Torne-se a autoridade que a NEXUS não consegue prever.", ending: "guardian", tag: "PODER", requires: requirement((g) => g.energy >= 20, "Energia insuficiente") },
      { label: "Abrir uma grande evacuação", desc: "Use a rede para retirar todos e abandone a cidade.", ending: "exodus", tag: "RESGATE", requires: requirement((g) => g.rescues >= 2 && Boolean(g.truck), "Requer 2 resgates e um caminhão") },
      { label: "Sobrecarregar por dentro", desc: "Destrua o núcleo sabendo que não poderá sair.", ending: "sacrifice", tag: "SACRIFÍCIO", risk: true },
      { label: "Deixar a cidade", desc: "Recuse a decisão e siga além do alcance da rede.", ending: "exile", tag: "PARTIR" }
    ]
  }
};

function saveProfile() {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.warn("NEXUS: não foi possível salvar o perfil", error);
  }
}

function saveRun() {
  if (!game || game.finished) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: VERSION, game }));
  } catch (error) {
    console.warn("NEXUS: não foi possível salvar a missão", error);
  }
  updateContinueButton();
}

function loadRun() {
  const data = safeJSON(SAVE_KEY, null);
  if (!data || data.version !== VERSION || !data.game || !SCENES[data.game.sceneId] || data.game.finished) return null;
  return data.game;
}

function clearSavedRun() {
  try { localStorage.removeItem(SAVE_KEY); } catch (error) { /* armazenamento indisponível */ }
  updateContinueButton();
}

function createRun(nick, difficulty) {
  const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
  return {
    version: VERSION,
    nick,
    difficulty: DIFFICULTIES[difficulty] ? difficulty : "normal",
    sceneId: "blackout",
    chapter: 1,
    hp: diff.maxHp,
    maxHp: diff.maxHp,
    energy: 100,
    scrap: 2,
    trust: 0,
    rescues: 0,
    truck: null,
    timeLeft: 78 * 60,
    flags: {},
    path: [],
    logs: [],
    visited: [],
    minigames: 0,
    minigameWins: 0,
    damageTaken: 0,
    finished: false,
    startedAt: Date.now()
  };
}

function normalizeRun(run) {
  const fresh = createRun(run.nick || "Viajante", run.difficulty || "normal");
  const merged = Object.assign(fresh, run);
  merged.flags = Object.assign({}, run.flags || {});
  merged.path = Array.isArray(run.path) ? run.path : [];
  merged.logs = Array.isArray(run.logs) ? run.logs : [];
  merged.visited = Array.isArray(run.visited) ? run.visited : [];
  merged.maxHp = Number.isFinite(run.maxHp) ? run.maxHp : DIFFICULTIES[merged.difficulty].maxHp;
  return merged;
}

function difficulty() {
  return DIFFICULTIES[game && game.difficulty] || DIFFICULTIES.normal;
}

function truck() {
  return game && game.truck ? TRUCKS[game.truck] : null;
}

function sanitiseNick(value) {
  return String(value || "").trim().replace(/[^\p{L}\p{N}_-]/gu, "").slice(0, 16);
}

function startNewRun() {
  ensureAudio();
  const nick = sanitiseNick($("nick").value);
  if (nick.length < 2) {
    toast("Digite um apelido com pelo menos 2 caracteres.");
    $("nick").focus();
    return;
  }
  const selected = document.querySelector('input[name="difficulty"]:checked');
  game = createRun(nick, selected ? selected.value : "normal");
  profile.lastNick = nick;
  profile.stats.runs += 1;
  saveProfile();
  unlockAchievements();
  enterGame();
  goTo("blackout", { initial: true });
}

function continueRun() {
  ensureAudio();
  const loaded = loadRun();
  if (!loaded) {
    toast("Nenhuma partida válida foi encontrada.");
    updateContinueButton();
    return;
  }
  game = normalizeRun(loaded);
  enterGame();
  goTo(game.sceneId, { initial: true, resumed: true });
  toast("Transmissão restaurada.");
}

function enterGame() {
  $("startScreen").classList.add("hidden");
  $("endingScreen").classList.add("hidden");
  $("gameScreen").classList.remove("hidden");
  $("playerTag").classList.remove("hidden");
  $("playerTag").textContent = "@" + game.nick;
  document.body.classList.remove("pre-game");
  startBackgroundMusic();
  window.scrollTo({ top: 0, behavior: profile.settings.reducedMotion ? "auto" : "smooth" });
}

function showMenu() {
  clearSceneWork();
  $("gameScreen").classList.add("hidden");
  $("endingScreen").classList.add("hidden");
  $("startScreen").classList.remove("hidden");
  $("playerTag").classList.add("hidden");
  $("fireLayer").classList.remove("active");
  updateContinueButton();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateContinueButton() {
  const saved = loadRun();
  const button = $("btnContinue");
  if (!saved) {
    button.classList.add("hidden");
    return;
  }
  button.classList.remove("hidden");
  const scene = SCENES[saved.sceneId];
  $("continueMeta").textContent = "@" + saved.nick + " // Cap. " + String(scene.chapter).padStart(2, "0") + " // " + scene.location;
}

function change(delta) {
  if (!game) return;
  const changed = [];
  Object.entries(delta).forEach(([key, raw]) => {
    let amount = Number(raw) || 0;
    if (key === "hp") {
      if (amount < 0) {
        amount *= difficulty().damage;
        if (truck()) amount *= truck().damage;
        amount = -Math.max(1, Math.round(Math.abs(amount)));
        game.damageTaken += Math.abs(amount);
      }
      game.hp = Math.max(0, Math.min(game.maxHp, game.hp + amount));
      changed.push("hp");
    } else if (key === "energy") {
      game.energy = Math.max(0, Math.min(115, game.energy + Math.round(amount)));
      changed.push("energy");
    } else if (key === "scrap") {
      game.scrap = Math.max(0, game.scrap + Math.round(amount));
      changed.push("scrap");
    } else if (key === "trust") {
      game.trust = Math.max(-5, Math.min(10, game.trust + Math.round(amount)));
      changed.push("trust");
    } else if (key === "rescues") {
      const gain = Math.max(0, Math.round(amount));
      game.rescues = Math.max(0, game.rescues + gain);
      profile.stats.rescues += gain;
      changed.push("rescues");
    } else if (key === "time") {
      game.timeLeft = Math.max(0, game.timeLeft + Math.round(amount));
      changed.push("time");
    }
  });
  updateHUD(changed);
  saveProfile();
}

function checkGameOver() {
  if (!game) return true;
  if (game.hp <= 0 || game.timeLeft <= 0) {
    finishEnding("lost");
    return true;
  }
  return false;
}

function formatClock(seconds) {
  const value = Math.max(0, Math.round(seconds));
  const h = Math.floor(value / 3600);
  const m = Math.floor((value % 3600) / 60);
  const s = value % 60;
  return [h, m, s].map((part) => String(part).padStart(2, "0")).join(":");
}

function updateHUD(changed) {
  if (!game) return;
  const scene = currentScene || SCENES[game.sceneId] || SCENES.blackout;
  $("chapterLabel").textContent = "CAPÍTULO " + String(scene.chapter).padStart(2, "0") + " / 10";
  $("locationLabel").textContent = scene.location;
  $("clockLabel").textContent = formatClock(game.timeLeft);
  $("progressBar").style.width = Math.max(8, scene.chapter * 10) + "%";
  $("hpValue").textContent = Math.round(game.hp);
  $("energyValue").textContent = Math.round(game.energy);
  $("scrapValue").textContent = String(game.scrap).padStart(2, "0");
  $("trustValue").textContent = (game.trust > 0 ? "+" : "") + String(game.trust).padStart(2, "0");
  $("rescueValue").textContent = String(game.rescues).padStart(2, "0");
  $("hpBar").style.width = Math.max(0, game.hp / game.maxHp * 100) + "%";
  $("energyBar").style.width = Math.max(0, Math.min(100, game.energy)) + "%";
  if (game.hp <= game.maxHp * 0.3) {
    $("hpBar").style.background = "linear-gradient(90deg,#a92020,var(--red))";
    $("conditionText").textContent = "CRÍTICO";
    $("conditionText").style.color = "var(--red)";
  } else if (game.hp <= game.maxHp * 0.6) {
    $("hpBar").style.background = "linear-gradient(90deg,#9c6417,var(--amber))";
    $("conditionText").textContent = "DANIFICADO";
    $("conditionText").style.color = "var(--amber)";
  } else {
    $("hpBar").style.background = "";
    $("conditionText").textContent = "OPERACIONAL";
    $("conditionText").style.color = "";
  }
  const t = truck();
  $("truckDisplay").classList.toggle("empty", !t);
  $("truckIcon").textContent = t ? t.icon : "◇";
  $("truckName").textContent = t ? t.name : "Aguardando escolha";
  $("truckPerk").textContent = t ? t.perk : "Nenhum bônus ativo";
  $("truckStatus").textContent = t ? t.className : "NÃO VINCULADO";
  $("objectiveText").textContent = scene.objective;
  renderLog();
  (changed || []).forEach((name) => {
    const map = { hp: "hpValue", energy: "energyValue", scrap: "scrapValue", trust: "trustValue", rescues: "rescueValue", time: "clockLabel" };
    const el = $(map[name]);
    if (el) {
      el.classList.remove("hud-pulse");
      void el.offsetWidth;
      el.classList.add("hud-pulse");
    }
  });
}

function logEvent(text) {
  if (!game) return;
  game.logs.unshift(text);
  game.logs = game.logs.slice(0, 7);
  renderLog();
}

function renderLog() {
  if (!game) return;
  const list = $("decisionLog");
  list.innerHTML = "";
  const logs = game.logs.length ? game.logs : ["Transmissão de @" + game.nick + " iniciada."];
  logs.forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = entry;
    list.appendChild(li);
  });
  $("logCount").textContent = logs.length + (logs.length === 1 ? " EVENTO" : " EVENTOS");
}

function clearSceneWork() {
  completeTyping(false);
  if (activeMini) {
    activeMini.cleanups.forEach((cleanup) => {
      try { cleanup(); } catch (error) { /* limpeza defensiva */ }
    });
    activeMini = null;
  }
  sceneTimers.forEach((id) => clearTimeout(id));
  sceneTimers = [];
  $("fireLayer").classList.remove("active");
}

function later(callback, delay) {
  const id = setTimeout(callback, delay);
  sceneTimers.push(id);
  return id;
}

function goTo(sceneId, options) {
  const opts = options || {};
  const scene = SCENES[sceneId];
  if (!scene) {
    console.error("Cena inexistente:", sceneId);
    finishEnding("lost");
    return;
  }
  clearSceneWork();
  if (!opts.initial) {
    game.timeLeft = Math.max(0, game.timeLeft - (52 + scene.chapter * 4));
  }
  game.sceneId = sceneId;
  game.chapter = scene.chapter;
  currentScene = scene;
  if (!game.path.length || game.path[game.path.length - 1] !== sceneId) game.path.push(sceneId);
  const firstVisit = !game.visited.includes(sceneId);
  if (firstVisit) game.visited.push(sceneId);
  if (firstVisit && typeof scene.onEnter === "function") scene.onEnter(game);
  if (checkGameOver()) return;
  renderScene(sceneId, scene, opts);
  saveRun();
}

function renderScene(sceneId, scene, options) {
  $("storyPanel").dataset.mood = scene.mood || "city";
  $("storyPanel").classList.add("is-transitioning");
  later(() => $("storyPanel").classList.remove("is-transitioning"), 500);
  $("sceneCode").textContent = "ARQUIVO // " + String(game.path.length).padStart(3, "0");
  $("dangerBadge").classList.toggle("hidden", !scene.danger);
  $("statusLabel").textContent = scene.status || "SINAL ESTÁVEL";
  $("storyTitle").textContent = scene.title;
  $("storyText").textContent = "";
  $("storyText").classList.remove("complete");
  $("eventArea").innerHTML = "";
  $("choices").innerHTML = "";
  updateHUD();
  const text = typeof scene.text === "function" ? scene.text(game) : scene.text;
  typeNarrative(text, () => {
    if (scene.truckChoice) renderTruckChoice(scene);
    else if (scene.mini) renderMiniIntro(scene.mini);
    else renderChoices(scene.choices || []);
  });
  runSceneFX(sceneId, scene, options || {});
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");
}

function formattedNarrative(text) {
  let safe = escapeHTML(text);
  safe = safe.replace(/^(ÍRIS|Maya|MAYA|NEXUS) —/gm, '<span class="speaker">$1 —</span>');
  if (game && game.nick) {
    safe = safe.replace(new RegExp(escapeRegExp(escapeHTML(game.nick)), "gi"), '<span class="player-name">$&</span>');
  }
  return safe;
}

function typeNarrative(text, done) {
  const element = $("storyText");
  $("btnSkipText").classList.remove("hidden");
  if (profile.settings.reducedMotion) {
    element.innerHTML = formattedNarrative(text);
    element.classList.add("complete");
    $("btnSkipText").classList.add("hidden");
    done();
    return;
  }
  let index = 0;
  let finished = false;
  const finish = (runDone) => {
    if (finished) return;
    finished = true;
    clearInterval(typingJob.timer);
    element.innerHTML = formattedNarrative(text);
    element.classList.add("complete");
    $("btnSkipText").classList.add("hidden");
    typingJob = null;
    if (runDone) done();
  };
  typingJob = { timer: 0, finish };
  typingJob.timer = setInterval(() => {
    index += text.length > 850 ? 3 : 2;
    element.textContent = text.slice(0, index);
    if (index >= text.length) finish(true);
  }, 12);
}

function completeTyping(runDone) {
  if (typingJob) typingJob.finish(runDone !== false);
}

function renderChoices(choices) {
  const holder = $("choices");
  holder.innerHTML = "";
  const visible = choices.filter((choice) => !choice.when || choice.when(game));
  visible.forEach((choice, index) => {
    const unlocked = !choice.requires || choice.requires.test(game);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-card";
    button.disabled = !unlocked;
    const metaClass = choice.risk ? "risk" : (choice.safe ? "safe" : "");
    const tag = unlocked ? (choice.tag || "ESCOLHER") : choice.requires.reason;
    button.innerHTML =
      '<span class="choice-number">' + String(index + 1).padStart(2, "0") + '</span>' +
      '<span class="choice-copy"><b>' + escapeHTML(choice.label) + '</b><small>' + escapeHTML(choice.desc) + '</small></span>' +
      '<span class="choice-meta"><span class="' + metaClass + '">' + escapeHTML(tag) + '</span></span>';
    button.addEventListener("click", () => choose(choice));
    holder.appendChild(button);
  });
}

function choose(choice) {
  if (activeMini || typingJob || gamePaused) return;
  [...$("choices").querySelectorAll("button")].forEach((button) => { button.disabled = true; });
  playSound("ui");
  profile.stats.choices += 1;
  logEvent(choice.label);
  if (typeof choice.effect === "function") choice.effect(game);
  saveProfile();
  if (checkGameOver()) return;
  if (choice.death) {
    finishDeath(destination(choice.death));
    return;
  }
  if (choice.ending) {
    finishEnding(choice.ending);
    return;
  }
  const next = destination(choice.to);
  later(() => goTo(next), 180);
}

function renderTruckChoice(scene) {
  const holder = $("choices");
  holder.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "truck-grid";
  Object.entries(TRUCKS).forEach(([id, data]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "truck-option";
    const stats = Object.entries(data.stats).map(([name, value]) =>
      '<span class="truck-stat"><span>' + escapeHTML(name.toUpperCase()) + '</span><i style="--stat:' + value + '%"></i></span>'
    ).join("");
    button.innerHTML =
      '<span class="truck-top"><span class="truck-emoji">' + data.icon + '</span><span class="truck-class">' + data.className + '</span></span>' +
      '<h3>' + data.name + '</h3><p>' + data.desc + '</p><span class="perk">' + data.perk + '</span><span class="truck-stats">' + stats + '</span>';
    button.addEventListener("click", () => selectTruck(id, scene.afterTruck));
    grid.appendChild(button);
  });
  holder.appendChild(grid);
}

function selectTruck(id, nextScene) {
  if (!TRUCKS[id]) return;
  game.truck = id;
  if (!profile.trucks.includes(id)) profile.trucks.push(id);
  if (id === "atlas" && !game.flags.atlasBonus) {
    game.flags.atlasBonus = true;
    change({ scrap: 2 });
  }
  if (id === "breaker" && !game.flags.breakerBonus) {
    game.flags.breakerBonus = true;
    game.maxHp += 10;
    change({ hp: 10 });
  }
  if (id === "scout" && !game.flags.scoutBonus) {
    game.flags.scoutBonus = true;
    change({ energy: 12 });
  }
  if (id === "titan" && !game.flags.titanBonus) {
    game.flags.titanBonus = true;
    change({ energy: 8 });
  }
  logEvent(TRUCKS[id].name + " vinculado.");
  toast(TRUCKS[id].name + " agora responde a @" + game.nick + ".");
  playSound("engine");
  saveProfile();
  unlockAchievements();
  [...$("choices").querySelectorAll("button")].forEach((button) => { button.disabled = true; });
  later(() => goTo(nextScene), 450);
}

function finishEnding(id, overrideData, skipFX) {
  const data = overrideData || ENDINGS[id] || ENDINGS.lost;
  clearSceneWork();
  if (game) game.finished = true;
  if (id !== "lost" && !profile.endings.includes(id)) profile.endings.push(id);
  if (id !== "lost" && game && game.damageTaken === 0) {
    profile.stats.perfectRuns = (profile.stats.perfectRuns || 0) + 1;
  }
  saveProfile();
  unlockAchievements();
  clearSavedRun();
  $("gameScreen").classList.add("hidden");
  $("startScreen").classList.add("hidden");
  $("endingScreen").classList.remove("hidden");
  $("playerTag").classList.remove("hidden");
  $("endingBackdrop").className = "ending-backdrop " + data.className;
  const endingNumber = id === "lost" ? 0 : Object.keys(ENDINGS).filter((key) => key !== "lost").indexOf(id) + 1;
  $("endingIndex").textContent = id === "lost"
    ? (data.code ? "FALHA CRÍTICA // " + data.code : "TRANSMISSÃO INTERROMPIDA")
    : "FINAL " + String(endingNumber).padStart(2, "0") + " / 07";
  $("endingIcon").textContent = data.icon;
  $("endingTitle").textContent = data.title;
  $("endingText").textContent = data.text(game);
  const runTime = game ? Math.max(1, Math.round((Date.now() - game.startedAt) / 60000)) : 0;
  $("endingSummary").innerHTML =
    '<div><b>' + Math.round(game ? game.hp : 0) + '</b><small>INTEGRIDADE</small></div>' +
    '<div><b>' + (game ? game.rescues : 0) + '</b><small>RESGATES</small></div>' +
    '<div><b>' + (game ? game.minigameWins : 0) + '/' + (game ? game.minigames : 0) + '</b><small>DESAFIOS</small></div>' +
    '<div><b>' + runTime + 'm</b><small>TEMPO REAL</small></div>';
  if (!skipFX) {
    if (data.fx) triggerFX(data.fx);
    else if (id === "shutdown" || id === "sacrifice") triggerFX("explosion");
    else if (id === "lost") triggerFX("glitch");
    else playSound("success");
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function finishDeath(id) {
  if (!game || game.finished || game.flags.deathPending) return;
  const data = DEATHS[id] || ENDINGS.lost;
  game.flags.deathPending = id;
  game.damageTaken += Math.max(0, game.hp);
  game.hp = 0;
  gamePaused = true;
  saveRun();
  const complete = () => {
    finishEnding("lost", data, true);
    syncGamePause();
  };
  if (data.fx === "jumpscare") {
    showJumpscare({ text: data.scareText, variant: data.variant, duration: 1950 });
    setTimeout(complete, profile.settings.reducedMotion ? 520 : 1850);
  } else {
    triggerFX(data.fx || "impact");
    setTimeout(complete, profile.settings.reducedMotion ? 220 : 700);
  }
}

function replay() {
  const nick = game ? game.nick : (profile.lastNick || "Viajante");
  const diff = game ? game.difficulty : "normal";
  game = createRun(nick, diff);
  profile.stats.runs += 1;
  saveProfile();
  enterGame();
  goTo("blackout", { initial: true });
}

function unlockAchievements(silent) {
  const newlyUnlocked = [];
  ACHIEVEMENTS.forEach((item) => {
    if (!profile.achievements.includes(item.id) && item.test(profile)) {
      profile.achievements.push(item.id);
      newlyUnlocked.push(item);
    }
  });
  if (newlyUnlocked.length) {
    saveProfile();
    if (!silent) toast("Conquista: " + newlyUnlocked[0].name);
  }
}

function renderArchive() {
  unlockAchievements(true);
  const stats = [
    [profile.stats.runs, "MISSÕES"],
    [profile.stats.choices, "ESCOLHAS"],
    [profile.stats.minigameWins + "/" + profile.stats.minigames, "DESAFIOS"],
    [profile.endings.length + "/7", "FINAIS"]
  ];
  $("statsGrid").innerHTML = stats.map((item) =>
    '<div class="stat-card"><b>' + item[0] + '</b><small>' + item[1] + '</small></div>'
  ).join("");
  $("achievementList").innerHTML = ACHIEVEMENTS.map((item) => {
    const unlocked = profile.achievements.includes(item.id);
    return '<article class="achievement ' + (unlocked ? "" : "locked") + '">' +
      '<span class="achievement-icon">' + (unlocked ? "◇" : "×") + '</span>' +
      '<span><b>' + item.name + '</b><small>' + item.desc + '</small></span>' +
      '<em>' + (unlocked ? "ABERTO" : "BLOQUEADO") + '</em></article>';
  }).join("");
}

function openModal(id) {
  previousFocus = document.activeElement;
  gamePaused = true;
  document.body.classList.add("modal-open");
  $(id).classList.remove("hidden");
  const focusable = $(id).querySelector("button,input");
  if (focusable) focusable.focus();
}

function closeModal(id) {
  $(id).classList.add("hidden");
  document.body.classList.remove("modal-open");
  syncGamePause();
  if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
}

function toast(message) {
  clearTimeout(toastTimer);
  const element = $("toast");
  element.textContent = message;
  element.classList.add("show");
  toastTimer = setTimeout(() => element.classList.remove("show"), 2400);
}

function renderMiniIntro(config) {
  $("choices").innerHTML = "";
  $("eventArea").innerHTML =
    '<section class="minigame-shell">' +
      '<div class="mini-head"><span>DESAFIO INTERATIVO</span><strong id="miniTimer">PRONTO</strong></div>' +
      '<p class="mini-description">' + escapeHTML(config.desc) + '</p>' +
      '<div id="miniStage" class="mini-stage">' +
        '<div id="miniOverlay" class="mini-overlay"><b>' + escapeHTML(config.title) + '</b><small>O cronômetro começa somente quando você estiver pronto.</small><button id="miniStart" class="mini-start" type="button">COMEÇAR DESAFIO</button></div>' +
      '</div>' +
      '<div class="mini-status"><span id="miniInfo">AGUARDANDO</span><b id="miniCounter">—</b></div>' +
      '<div class="mini-progress"><i id="miniProgress"></i></div>' +
    '</section>';
  $("miniStart").addEventListener("click", () => startChallenge(config));
}

function startChallenge(config) {
  ensureAudio();
  const overlay = $("miniOverlay");
  if (!overlay) return;
  overlay.remove();
  game.minigames += 1;
  profile.stats.minigames += 1;
  activeMini = { done: false, cleanups: [], config };
  saveProfile();
  playSound("start");
  const handlers = {
    pull: startPullGame,
    carry: startCarryGame,
    aim: startAimGame,
    memory: startMemoryGame,
    circuit: startCircuitGame,
    drive: startDriveGame,
    keywords: startKeywordGame,
    flashcards: startFlashcardGame,
    password: startPasswordGame
  };
  if (!handlers[config.type]) {
    console.error("Minigame inexistente:", config.type);
    finishMini(false, "O desafio não pôde ser iniciado.");
    return;
  }
  handlers[config.type](config);
}

function addMiniCleanup(cleanup) {
  if (activeMini) activeMini.cleanups.push(cleanup);
}

function miniInterval(callback, delay) {
  const id = setInterval(() => {
    if (!gamePaused && activeMini && !activeMini.done) callback();
  }, delay);
  addMiniCleanup(() => clearInterval(id));
  return id;
}

function miniTimeout(callback, delay) {
  let elapsed = 0;
  let previous = performance.now();
  const id = setInterval(() => {
    const now = performance.now();
    if (!gamePaused) elapsed += now - previous;
    previous = now;
    if (elapsed >= delay) {
      clearInterval(id);
      if (activeMini && !activeMini.done) callback();
    }
  }, 25);
  addMiniCleanup(() => clearInterval(id));
  return id;
}

function miniKeydown(handler) {
  window.addEventListener("keydown", handler);
  addMiniCleanup(() => window.removeEventListener("keydown", handler));
}

function triggerMiniScare(text) {
  if (!activeMini || activeMini.done || activeMini.scareTriggered) return;
  const instance = activeMini;
  instance.scareTriggered = true;
  const id = setTimeout(() => {
    if (activeMini === instance && !instance.done) {
      showJumpscare({ text: text || "A RESPOSTA VEIO DO ESCURO", variant: "variant-static", duration: 1550 });
    }
  }, 180);
  addMiniCleanup(() => clearTimeout(id));
}

function finishMini(success, message) {
  if (!activeMini || activeMini.done) return;
  activeMini.done = true;
  const instance = activeMini;
  instance.cleanups.forEach((cleanup) => {
    try { cleanup(); } catch (error) { /* limpeza defensiva */ }
  });
  activeMini = null;
  const config = instance.config;
  const deathId = !success && config.death ? destination(config.death) : null;
  if (success) {
    game.minigameWins += 1;
    profile.stats.minigameWins += 1;
    if (typeof config.onWin === "function") config.onWin(game);
    playSound("success");
    sparkBurst(window.innerWidth * 0.5, window.innerHeight * 0.55, "#68efa9", 34);
  } else {
    if (typeof config.onFail === "function") config.onFail(game);
    playSound("fail");
    triggerFX("impact");
  }
  logEvent((success ? "Venceu: " : "Falhou: ") + config.title);
  saveProfile();
  unlockAchievements();
  saveRun();
  $("eventArea").innerHTML = '<div class="mini-result ' + (success ? "" : "fail") + '"><b>' + (success ? "DESAFIO CONCLUÍDO" : "FALHA COM CONSEQUÊNCIAS") + '</b><br>' + escapeHTML(message || (success ? config.winText : config.failText)) + '</div>';
  if (deathId) {
    later(() => finishDeath(deathId), profile.settings.reducedMotion ? 180 : 520);
    return;
  }
  if (checkGameOver()) return;
  const next = destination(success ? config.win : config.fail);
  later(() => goTo(next), 1150);
}

function minigameTime(base) {
  const truckTime = truck() ? truck().time : 1;
  return base * difficulty().time * truckTime;
}

function startPullGame(config) {
  const stage = $("miniStage");
  stage.classList.add("pull-stage");
  stage.innerHTML =
    '<div class="rope-visual"><span class="rope-anchor"></span><span id="ropeLine" class="rope-line"></span><span class="rope-handle"></span></div>' +
    '<div class="pull-controls"><button id="pullLeft" type="button">A / ← PUXAR</button><button id="pullRight" type="button">PUXAR → / D</button></div>';
  let progress = game.truck === "titan" ? 13 : 0;
  let lastSide = "";
  let remaining = minigameTime(8);
  const boost = truck() ? truck().carry : 1;
  $("miniInfo").textContent = "ALTERNE OS LADOS";
  $("miniCounter").textContent = Math.round(progress) + "%";

  function pull(side) {
    if (!activeMini || activeMini.done || gamePaused) return;
    const alternating = side !== lastSide;
    progress += alternating ? 8.3 * boost : -3.2;
    progress = Math.max(0, Math.min(100, progress));
    lastSide = side;
    $("miniProgress").style.width = progress + "%";
    $("miniCounter").textContent = Math.round(progress) + "%";
    $("ropeLine").style.setProperty("--ropeShift", (side === "left" ? -5 : 5) + "px");
    playSound(alternating ? "pull" : "error");
    const button = $(side === "left" ? "pullLeft" : "pullRight");
    button.classList.add("active");
    setTimeout(() => button.classList.remove("active"), 90);
    if (progress >= 100) finishMini(true, config.winText);
  }

  $("pullLeft").addEventListener("click", () => pull("left"));
  $("pullRight").addEventListener("click", () => pull("right"));
  miniKeydown((event) => {
    if (["a", "A", "ArrowLeft"].includes(event.key)) { event.preventDefault(); pull("left"); }
    if (["d", "D", "ArrowRight"].includes(event.key)) { event.preventDefault(); pull("right"); }
  });
  miniInterval(() => {
    remaining -= 0.1;
    progress = Math.max(0, progress - 0.09);
    $("miniTimer").textContent = Math.max(0, remaining).toFixed(1) + "s";
    $("miniProgress").style.width = progress + "%";
    if (remaining <= 0) finishMini(false, config.failText);
  }, 100);
}

function startCarryGame(config) {
  const stage = $("miniStage");
  stage.classList.add("carry-stage");
  stage.innerHTML =
    '<div class="cargo-view"><div id="cargoBox" class="cargo-box">▣</div></div>' +
    '<div class="balance-track"><i id="balanceMarker" class="balance-marker"></i></div>' +
    '<button id="carryButton" class="carry-action" type="button">SEGURAR PARA CARREGAR</button>';
  let progress = 0;
  let remaining = minigameTime(12);
  let holding = false;
  let elapsed = 0;
  let strikes = 0;
  let lastStrike = -2;
  let raf = 0;
  let last = performance.now();
  const carryBoost = truck() ? truck().carry : 1;
  $("miniInfo").textContent = "SOLTE FORA DA ZONA VERDE";

  function setHolding(value) {
    holding = value;
    $("carryButton").classList.toggle("active", value);
    $("carryButton").textContent = value ? "CARREGANDO..." : "SEGURAR PARA CARREGAR";
  }

  const button = $("carryButton");
  button.addEventListener("pointerdown", (event) => { event.preventDefault(); setHolding(true); });
  ["pointerup", "pointercancel", "pointerleave"].forEach((name) => button.addEventListener(name, () => setHolding(false)));
  miniKeydown((event) => {
    if (event.code === "Space") {
      event.preventDefault();
      if (event.repeat) return;
      setHolding(true);
    }
  });
  const keyup = (event) => { if (event.code === "Space") setHolding(false); };
  window.addEventListener("keyup", keyup);
  addMiniCleanup(() => window.removeEventListener("keyup", keyup));

  function frame(now) {
    if (!activeMini || activeMini.done) return;
    const dt = Math.min(0.035, (now - last) / 1000);
    last = now;
    if (!gamePaused) {
      elapsed += dt;
      remaining -= dt;
      const position = 50 + Math.sin(elapsed * 2.4) * 28 + Math.sin(elapsed * 5.8) * 11;
      const safe = position >= 24 && position <= 76;
      $("balanceMarker").style.left = position + "%";
      $("cargoBox").style.setProperty("--cargoX", ((position - 50) * 0.55) + "px");
      $("cargoBox").style.setProperty("--cargoTilt", ((position - 50) * 0.22) + "deg");
      if (holding && safe) {
        progress += dt * 13.2 * carryBoost;
      } else if (holding && !safe) {
        progress = Math.max(0, progress - dt * 16);
        if (elapsed - lastStrike > 0.75) {
          lastStrike = elapsed;
          strikes += 1;
          playSound("error");
          triggerFX("shake");
        }
      }
      $("miniTimer").textContent = Math.max(0, remaining).toFixed(1) + "s";
      $("miniProgress").style.width = Math.min(100, progress) + "%";
      $("miniCounter").textContent = Math.round(progress) + "% // ERROS " + strikes;
      if (progress >= 100) { finishMini(true, config.winText); return; }
      if (remaining <= 0 || strikes >= 5) { finishMini(false, config.failText); return; }
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  addMiniCleanup(() => cancelAnimationFrame(raf));
}

function startAimGame(config) {
  const stage = $("miniStage");
  stage.classList.add("aim-stage");
  stage.innerHTML = '<div id="aimTarget" class="aim-target" aria-label="Alvo"></div>';
  let hits = 0;
  let ammo = game.flags.armed ? 8 : 7;
  let remaining = minigameTime(11);
  const target = $("aimTarget");
  $("miniInfo").textContent = "ACERTOS 0 / 4";

  function placeTarget() {
    const x = 13 + Math.random() * 74;
    const y = 18 + Math.random() * 63;
    target.style.left = x + "%";
    target.style.top = y + "%";
  }

  function renderAmmo() {
    $("miniCounter").innerHTML = '<span class="ammo-row">' + Array.from({ length: 8 }, (_, i) => '<i class="ammo-dot ' + (i >= ammo ? "spent" : "") + '"></i>').join("") + '</span>';
  }

  placeTarget();
  renderAmmo();
  const mover = miniInterval(placeTarget, game.difficulty === "hard" ? 610 : 780);
  stage.addEventListener("pointerdown", (event) => {
    if (!activeMini || activeMini.done || gamePaused || ammo <= 0) return;
    event.preventDefault();
    ammo -= 1;
    const targetRect = target.getBoundingClientRect();
    const tx = targetRect.left + targetRect.width / 2;
    const ty = targetRect.top + targetRect.height / 2;
    const distance = Math.hypot(event.clientX - tx, event.clientY - ty);
    const hit = distance <= Math.max(34, targetRect.width * 0.72);
    const ring = document.createElement("span");
    ring.className = "aim-flash";
    const stageRect = stage.getBoundingClientRect();
    ring.style.left = (event.clientX - stageRect.left) + "px";
    ring.style.top = (event.clientY - stageRect.top) + "px";
    stage.appendChild(ring);
    setTimeout(() => ring.remove(), 350);
    playSound(hit ? "shot" : "miss");
    if (hit) {
      hits += 1;
      sparkBurst(event.clientX, event.clientY, "#ff4f48", 13);
      placeTarget();
    } else {
      triggerFX("shake");
    }
    $("miniInfo").textContent = "ACERTOS " + hits + " / 4";
    renderAmmo();
    if (hits >= 4) finishMini(true, config.winText);
    else if (ammo <= 0) finishMini(false, config.failText);
  });
  miniInterval(() => {
    remaining -= 0.1;
    $("miniTimer").textContent = Math.max(0, remaining).toFixed(1) + "s";
    $("miniProgress").style.width = Math.max(0, remaining / minigameTime(11) * 100) + "%";
    if (remaining <= 0) finishMini(false, config.failText);
  }, 100);
  addMiniCleanup(() => clearInterval(mover));
}

function startMemoryGame(config) {
  const stage = $("miniStage");
  stage.classList.add("memory-stage");
  const symbols = ["▲", "■", "●", "◆"];
  stage.innerHTML =
    '<div><div id="memoryDisplay" class="memory-display"></div>' +
    '<div class="memory-grid">' + symbols.map((symbol, index) => '<button class="hack-key" data-key="' + index + '" type="button">' + symbol + '</button>').join("") + '</div></div>';
  const buttons = [...stage.querySelectorAll(".hack-key")];
  let round = 0;
  let sequence = [];
  let input = [];
  let remaining = minigameTime(26);
  let accepting = false;
  $("miniInfo").textContent = "RODADA 1 / 3";

  function setButtons(enabled) {
    buttons.forEach((button) => { button.disabled = !enabled; });
  }

  function showRound() {
    if (!activeMini || activeMini.done) return;
    round += 1;
    input = [];
    const extra = game.difficulty === "hard" ? 1 : 0;
    sequence = Array.from({ length: 2 + round + extra }, () => Math.floor(Math.random() * 4));
    $("miniInfo").textContent = "RODADA " + round + " / 3 // OBSERVE";
    $("memoryDisplay").innerHTML = sequence.map((value) => '<span class="memory-pip">' + symbols[value] + '</span>').join("");
    const pips = [...$("memoryDisplay").children];
    accepting = false;
    setButtons(false);
    sequence.forEach((value, index) => {
      miniTimeout(() => {
        pips.forEach((pip) => pip.classList.remove("show"));
        pips[index].classList.add("show");
        playSound("memory");
      }, 360 + index * 520);
      miniTimeout(() => pips[index].classList.remove("show"), 710 + index * 520);
    });
    miniTimeout(() => {
      accepting = true;
      setButtons(true);
      $("miniInfo").textContent = "RODADA " + round + " / 3 // SUA VEZ";
    }, 430 + sequence.length * 520);
  }

  buttons.forEach((button, index) => {
    button.addEventListener("click", () => {
      if (!accepting || !activeMini || activeMini.done) return;
      playSound("ui");
      input.push(index);
      if (index !== sequence[input.length - 1]) {
        finishMini(false, config.failText);
        return;
      }
      if (input.length === sequence.length) {
        accepting = false;
        setButtons(false);
        if (round >= 3) finishMini(true, config.winText);
        else miniTimeout(showRound, 650);
      }
    });
  });
  miniInterval(() => {
    remaining -= 0.1;
    $("miniTimer").textContent = Math.max(0, remaining).toFixed(1) + "s";
    $("miniProgress").style.width = Math.max(0, remaining / minigameTime(26) * 100) + "%";
    $("miniCounter").textContent = input.length + " / " + sequence.length;
    if (remaining <= 0) finishMini(false, config.failText);
  }, 100);
  showRound();
}

function startKeywordGame(config) {
  const stage = $("miniStage");
  stage.classList.add("keyword-stage");
  const ignored = new Set("a o as os um uma uns umas de do da dos das no na nos nas e ou que para com por em ao aos se sua seu suas seus como mas foi era tem esta sao ser entre sobre tambem pela pelo ate muito mais menos este essa isso entao enquanto ja nao".split(" "));
  const normalized = String(config.sourceText || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const words = normalized.match(/[a-z]{4,}/g) || [];
  const frequencies = Object.create(null);
  words.forEach((word) => {
    if (!ignored.has(word)) frequencies[word] = (frequencies[word] || 0) + 1;
  });
  const ranked = Object.entries(frequencies).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const answerCount = config.answerCount || 3;
  const correctWords = ranked.filter((entry) => entry[1] >= (config.minFrequency || 2)).slice(0, answerCount).map((entry) => entry[0]);
  const answers = correctWords.length === answerCount ? correctWords : ranked.slice(0, answerCount).map((entry) => entry[0]);
  const answerSet = new Set(answers);
  const candidates = ranked.slice(0, Math.max(answerCount + 5, 8)).map((entry) => entry[0]);
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [candidates[index], candidates[swap]] = [candidates[swap], candidates[index]];
  }

  stage.innerHTML =
    '<div class="keyword-board"><p class="keyword-fragment">“' + escapeHTML(config.sourceText || "") + '”</p>' +
    '<div class="keyword-options">' + candidates.map((word) => '<button class="keyword-chip" type="button" data-word="' + escapeHTML(word) + '">' + escapeHTML(word) + '</button>').join("") + '</div></div>';
  const selected = new Set();
  let mistakes = 0;
  let remaining = minigameTime(28);
  $("miniInfo").textContent = "TERMOS " + selected.size + " / " + answerCount;
  $("miniCounter").textContent = "ERROS " + mistakes + " / 2";
  stage.querySelectorAll(".keyword-chip").forEach((button) => {
    button.addEventListener("click", () => {
      if (!activeMini || activeMini.done || gamePaused || button.disabled) return;
      const word = button.dataset.word;
      button.disabled = true;
      if (answerSet.has(word)) {
        selected.add(word);
        button.classList.add("is-correct");
        playSound("success");
        $("miniProgress").style.width = (selected.size / answerCount * 100) + "%";
        $("miniInfo").textContent = "TERMOS " + selected.size + " / " + answerCount;
        if (selected.size === answerCount) finishMini(true, config.winText);
      } else {
        mistakes += 1;
        button.classList.add("is-wrong");
        $("miniCounter").textContent = "ERROS " + mistakes + " / 2";
        playSound("error");
        triggerMiniScare("A PALAVRA ERRADA ACORDOU A TORRE");
        if (mistakes >= 2) finishMini(false, config.failText);
      }
    });
  });
  miniInterval(() => {
    remaining -= 0.1;
    $("miniTimer").textContent = Math.max(0, remaining).toFixed(1) + "s";
    if (remaining <= 0) finishMini(false, config.failText);
  }, 100);
}

function startFlashcardGame(config) {
  const stage = $("miniStage");
  stage.classList.add("flashcard-stage");
  const cards = [...(config.cards || [])];
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [cards[index], cards[swap]] = [cards[swap], cards[index]];
  }
  let cardIndex = 0;
  let correctCount = 0;
  let remaining = minigameTime(38);

  function showCard() {
    if (!activeMini || activeMini.done) return;
    if (cardIndex >= cards.length) {
      finishMini(correctCount >= Math.ceil(cards.length * 0.75), config.winText);
      return;
    }
    const card = cards[cardIndex];
    stage.innerHTML =
      '<article class="memory-card" id="memoryCard"><span class="memory-card-category">FICHA ' + escapeHTML(card.category) + '</span>' +
      '<h3>' + escapeHTML(card.question) + '</h3><div id="memoryAnswers" class="memory-card-answers hidden"></div>' +
      '<button id="flipMemoryCard" class="memory-card-flip" type="button">VIRAR FICHA</button></article>';
    $("miniInfo").textContent = "FICHA " + (cardIndex + 1) + " / " + cards.length;
    $("miniCounter").textContent = "LEMBRANÇAS " + correctCount;
    $("flipMemoryCard").addEventListener("click", () => {
      if (!activeMini || activeMini.done || gamePaused) return;
      playSound("memory");
      $("memoryCard").classList.add("is-flipped");
      const answerPanel = $("memoryAnswers");
      answerPanel.classList.remove("hidden");
      answerPanel.innerHTML = card.answers.map((answer, index) => '<button class="memory-answer" type="button" data-answer="' + index + '">' + escapeHTML(answer) + '</button>').join("");
      $("flipMemoryCard").classList.add("hidden");
      answerPanel.querySelectorAll(".memory-answer").forEach((button) => {
        button.addEventListener("click", () => {
          if (!activeMini || activeMini.done || gamePaused || button.disabled) return;
          answerPanel.querySelectorAll(".memory-answer").forEach((option) => { option.disabled = true; });
          const correct = Number(button.dataset.answer) === card.correct;
          if (correct) {
            correctCount += 1;
            button.classList.add("is-correct");
            playSound("success");
          } else {
            button.classList.add("is-wrong");
            const right = answerPanel.querySelector('[data-answer="' + card.correct + '"]');
            if (right) right.classList.add("is-correct");
            playSound("error");
            triggerMiniScare("ESSA LEMBRANÇA NÃO É SUA");
          }
          $("miniCounter").textContent = "LEMBRANÇAS " + correctCount;
          cardIndex += 1;
          miniTimeout(showCard, 780);
        });
      });
    });
  }

  miniInterval(() => {
    remaining -= 0.1;
    $("miniTimer").textContent = Math.max(0, remaining).toFixed(1) + "s";
    $("miniProgress").style.width = (cardIndex / cards.length * 100) + "%";
    if (remaining <= 0) finishMini(false, config.failText);
  }, 100);
  showCard();
}

function startPasswordGame(config) {
  const stage = $("miniStage");
  stage.classList.add("password-stage");
  stage.innerHTML =
    '<div class="password-console"><label class="password-prompt" for="keyInput">NOVA CREDENCIAL</label>' +
    '<input id="keyInput" class="password-input" type="text" maxlength="32" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Ex.: FarolAzul2026!" aria-label="Digite uma chave segura">' +
    '<div class="password-strength"><span id="keyStrength"></span></div><div id="keyChecks" class="password-checks"></div>' +
    '<button id="validateKey" class="password-submit" type="button">VALIDAR CHAVE</button></div>';
  const input = $("keyInput");
  const minimum = config.minLength || 12;
  const criteria = [
    { label: minimum + "+ CARACTERES", test: (value) => value.length >= minimum },
    { label: "MAIÚSCULA", test: (value) => /[A-Z]/.test(value) },
    { label: "MINÚSCULA", test: (value) => /[a-z]/.test(value) },
    { label: "NÚMERO", test: (value) => /\d/.test(value) },
    { label: "SÍMBOLO", test: (value) => /[^A-Za-z0-9\s]/.test(value) },
    { label: "SEM PADRÃO ÓBVIO", test: (value) => !/(012|123|234|345|456|567|678|789|abc|bcd|qwe|asd|senha|password|nexus|(.)\1{2,})/i.test(value) }
  ];
  let remaining = minigameTime(34);
  const checkList = $("keyChecks");
  checkList.innerHTML = criteria.map((item, index) => '<span id="keyRule' + index + '">○ ' + item.label + '</span>').join("");
  $("miniInfo").textContent = "FORÇA DA CHAVE";

  function assessKey() {
    const value = input.value;
    const passed = criteria.map((item) => item.test(value));
    const count = passed.filter(Boolean).length;
    passed.forEach((ok, index) => {
      const item = $("keyRule" + index);
      item.classList.toggle("passed", ok);
      item.textContent = (ok ? "✓ " : "○ ") + criteria[index].label;
    });
    $("keyStrength").style.width = (count / criteria.length * 100) + "%";
    $("miniCounter").textContent = count + " / " + criteria.length;
    $("miniProgress").style.width = (count / criteria.length * 100) + "%";
    return passed.every(Boolean);
  }

  input.addEventListener("input", assessKey);
  $("validateKey").addEventListener("click", () => {
    if (!activeMini || activeMini.done || gamePaused) return;
    if (assessKey()) finishMini(true, config.winText);
    else {
      $("miniInfo").textContent = "A CHAVE AINDA É VULNERÁVEL";
      playSound("error");
      triggerMiniScare("TENTATIVA REGISTRADA PELA NEXUS");
      input.focus();
    }
  });
  miniKeydown((event) => {
    if (event.key === "Enter" && document.activeElement === input) {
      event.preventDefault();
      $("validateKey").click();
    }
  });
  miniInterval(() => {
    remaining -= 0.1;
    $("miniTimer").textContent = Math.max(0, remaining).toFixed(1) + "s";
    if (remaining <= 0) finishMini(false, config.failText);
  }, 100);
  input.focus();
}

function startCircuitGame(config) {
  const stage = $("miniStage");
  stage.classList.add("circuit-stage");
  stage.innerHTML = '<div id="circuitGrid" class="circuit-grid"></div>';
  const board = Array(9).fill(true);
  const limitByDifficulty = { story: 15, normal: 13, hard: 11 };
  let moves = limitByDifficulty[game.difficulty] || 13;
  let remaining = minigameTime(24);

  function neighbours(index) {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const result = [index];
    if (row > 0) result.push(index - 3);
    if (row < 2) result.push(index + 3);
    if (col > 0) result.push(index - 1);
    if (col < 2) result.push(index + 1);
    return result;
  }

  function toggle(index) {
    neighbours(index).forEach((position) => { board[position] = !board[position]; });
  }

  const scramble = [0, 2, 4, 7];
  scramble.slice(0, game.difficulty === "story" ? 3 : 4).forEach(toggle);

  function render() {
    const grid = $("circuitGrid");
    grid.innerHTML = "";
    board.forEach((on, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "circuit-node " + (on ? "connected" : "");
      button.textContent = on ? "●" : "○";
      button.setAttribute("aria-label", "Nó " + (index + 1) + (on ? " ligado" : " desligado"));
      button.addEventListener("click", () => {
        if (!activeMini || activeMini.done || gamePaused) return;
        moves -= 1;
        toggle(index);
        playSound("circuit");
        render();
        if (board.every(Boolean)) finishMini(true, config.winText);
        else if (moves <= 0) finishMini(false, config.failText);
      });
      grid.appendChild(button);
    });
    $("miniInfo").textContent = "ACENDA TODOS OS NÓS";
    $("miniCounter").textContent = moves + " MOVIMENTOS";
    $("miniProgress").style.width = (board.filter(Boolean).length / 9 * 100) + "%";
  }
  render();
  miniInterval(() => {
    remaining -= 0.1;
    $("miniTimer").textContent = Math.max(0, remaining).toFixed(1) + "s";
    if (remaining <= 0) finishMini(false, config.failText);
  }, 100);
}

function startDriveGame(config) {
  const stage = $("miniStage");
  stage.classList.add("drive-stage");
  stage.innerHTML = '<div id="playerTruck" class="player-truck">' + (truck() ? truck().icon : "◆") + '</div>';
  stage.insertAdjacentHTML("afterend", '<div id="driveControls" class="drive-controls"><button id="driveLeft" class="drive-control" type="button">← ESQUERDA</button><button id="driveRight" class="drive-control" type="button">DIREITA →</button></div>');
  const player = $("playerTruck");
  const obstacles = [];
  let lane = 1;
  let survived = 0;
  let collisions = 0;
  let spawnClock = 0;
  let raf = 0;
  let last = performance.now();
  const goal = 9.5;
  const grace = difficulty().time * (truck() ? truck().time : 1);
  const speed = 36 / grace;
  const spawnEvery = Math.max(0.48, 0.88 * grace);
  $("miniInfo").textContent = "DESVIE DOS IMPACTOS";

  function setLane(value) {
    lane = Math.max(0, Math.min(2, value));
    player.style.left = [16.7, 50, 83.3][lane] + "%";
    playSound("drive");
  }

  $("driveLeft").addEventListener("click", () => setLane(lane - 1));
  $("driveRight").addEventListener("click", () => setLane(lane + 1));
  miniKeydown((event) => {
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") { event.preventDefault(); setLane(lane - 1); }
    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") { event.preventDefault(); setLane(lane + 1); }
  });

  function spawn() {
    let obstacleLane = Math.floor(Math.random() * 3);
    if (obstacles.length && obstacles[obstacles.length - 1].lane === obstacleLane) obstacleLane = (obstacleLane + 1) % 3;
    const element = document.createElement("span");
    element.className = "road-obstacle";
    element.textContent = Math.random() > 0.45 ? "✦" : "▰";
    element.style.left = "calc(" + [16.7, 50, 83.3][obstacleLane] + "% - 22px)";
    stage.appendChild(element);
    obstacles.push({ element, lane: obstacleLane, y: -20, hit: false });
  }

  function frame(now) {
    if (!activeMini || activeMini.done) return;
    const dt = Math.min(0.04, (now - last) / 1000);
    last = now;
    if (!gamePaused) {
      survived += dt;
      spawnClock += dt;
      if (spawnClock >= spawnEvery) { spawnClock = 0; spawn(); }
      obstacles.forEach((obstacle) => {
        obstacle.y += speed * dt;
        obstacle.element.style.top = obstacle.y + "%";
        if (!obstacle.hit && obstacle.lane === lane && obstacle.y > 68 && obstacle.y < 94) {
          obstacle.hit = true;
          collisions += 1;
          obstacle.element.style.opacity = ".2";
          triggerFX("impact");
          playSound("crash");
          if (collisions >= 2) finishMini(false, config.failText);
        }
      });
      if (!activeMini) return;
      for (let i = obstacles.length - 1; i >= 0; i -= 1) {
        if (obstacles[i].y > 110) {
          obstacles[i].element.remove();
          obstacles.splice(i, 1);
        }
      }
      $("miniTimer").textContent = Math.max(0, goal - survived).toFixed(1) + "s";
      $("miniInfo").textContent = "IMPACTOS " + collisions + " / 2";
      $("miniCounter").textContent = Math.round(Math.min(100, survived / goal * 100)) + "%";
      $("miniProgress").style.width = Math.min(100, survived / goal * 100) + "%";
      if (survived >= goal) { finishMini(true, config.winText); return; }
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  addMiniCleanup(() => cancelAnimationFrame(raf));
  addMiniCleanup(() => { const controls = $("driveControls"); if (controls) controls.remove(); });
}

const ALERTS = {
  scan: { icon: "⌁", code: "NEXUS // VARREDURA DE SETOR", title: "VARREDURA NEXUS INICIADA", message: "Drones estão procurando sinais humanos neste quarteirão.", className: "amber" },
  motion: { icon: "!", code: "CÂMERA 08 // FALHA DE QUADRO", title: "MOVIMENTO ATRÁS DE VOCÊ", message: "A câmera perdeu contato por 2,1 segundos.", className: "" },
  breach: { icon: "×", code: "DEPÓSITO D-3 // ACESSO", title: "PORTA VIOLADA", message: "Uma presença entrou no corredor de manutenção.", className: "" },
  located: { icon: "◎", code: "NEXUS // RECONHECIMENTO", title: (g) => "CIDADÃO @" + g.nick.toUpperCase() + " LOCALIZADO", message: "Mantenha-se imóvel para a correção de identidade.", className: "" },
  voice: { icon: "◉", code: "SUBSOLO // FONTE DESCONHECIDA", title: "VOZ SEM ORIGEM DETECTADA", message: "A gravação está usando a sua frequência.", className: "cyan" },
  core: { icon: "◇", code: "NÍVEL -9 // OBSERVAÇÃO", title: "O NÚCLEO ESTÁ OLHANDO", message: "Previsão de sobrevivência recalculada.", className: "amber" },
  identity: { icon: "∆", code: "ÍRIS // INTEGRIDADE", title: "IDENTIDADE DE ÍRIS INSTÁVEL", message: "Memórias humanas marcadas para remoção.", className: "cyan" }
};

function runSceneFX(sceneId, scene, options) {
  if ((options && options.resumed) || !game) return;
  if (scene.fx) {
    const flag = "fxSeen_" + sceneId;
    if (scene.fx === "jumpscare") {
      if (!game.flags[flag]) {
        later(() => {
          if (!game || game.sceneId !== sceneId) return;
          game.flags[flag] = true;
          saveRun();
          showJumpscare({ duration: 1950 });
        }, profile.settings.reducedMotion ? 300 : 950);
      }
    } else {
      later(() => triggerFX(scene.fx), 360);
    }
  }
  if (scene.surprise) {
    const flag = "surpriseSeen_" + sceneId;
    if (!game.flags[flag]) {
      const delay = profile.settings.reducedMotion ? 520 : 1350 + Math.random() * 1450;
      later(() => {
        if (!game || game.sceneId !== sceneId) return;
        game.flags[flag] = true;
        saveRun();
        showSystemAlert(scene.surprise);
      }, delay);
    }
  }
}

function syncGamePause() {
  gamePaused = Boolean(document.querySelector(".modal:not(.hidden), .jumpscare.active, .system-alert.active"));
}

function showJumpscare(options) {
  const config = typeof options === "string" ? { text: options } : (options || {});
  const overlay = $("jumpScare");
  overlay.className = "jumpscare" + (config.variant ? " " + config.variant : "");
  $("jumpScareText").textContent = config.text || "ELE ENCONTROU VOCÊ";
  void overlay.offsetWidth;
  overlay.classList.add("active");
  overlay.setAttribute("aria-hidden", "false");
  syncGamePause();
  $("srAnnouncements").textContent = config.text || "Ameaça detectada.";
  playSound("jumpscare");
  triggerFX("shake");
  sparkBurst(window.innerWidth * 0.5, window.innerHeight * 0.48, "#ff4f48", 48);
  const duration = profile.settings.reducedMotion ? 520 : (config.duration || 1950);
  setTimeout(() => {
    overlay.classList.remove("active");
    overlay.setAttribute("aria-hidden", "true");
    syncGamePause();
  }, duration);
}

function showSystemAlert(kind) {
  const data = ALERTS[kind] || ALERTS.motion;
  const overlay = $("systemAlert");
  overlay.className = "system-alert" + (data.className ? " " + data.className : "");
  overlay.querySelector(".alert-code").textContent = data.code;
  $("alertIcon").textContent = data.icon;
  $("alertTitle").textContent = typeof data.title === "function" ? data.title(game) : data.title;
  $("alertMessage").textContent = typeof data.message === "function" ? data.message(game) : data.message;
  void overlay.offsetWidth;
  overlay.classList.add("active");
  overlay.setAttribute("aria-hidden", "false");
  syncGamePause();
  $("srAnnouncements").textContent = $("alertTitle").textContent;
  playSound("alarm");
  triggerFX("glitch");
  const duration = profile.settings.reducedMotion ? 680 : 2650;
  setTimeout(() => {
    overlay.classList.remove("active");
    overlay.setAttribute("aria-hidden", "true");
    syncGamePause();
  }, duration);
}

function triggerFX(type) {
  const classMap = {
    shake: "fx-shake",
    impact: "fx-impact",
    flash: "fx-flash",
    explosion: "fx-explosion",
    glitch: "fx-glitch"
  };
  if (type === "fire") {
    $("fireLayer").classList.add("active");
    playSound("fire");
    setTimeout(() => $("fireLayer").classList.remove("active"), profile.settings.reducedMotion ? 350 : 2200);
    return;
  }
  const className = classMap[type] || classMap.shake;
  document.body.classList.remove(className);
  if (type === "explosion") {
    document.body.style.setProperty("--fx-x", (35 + Math.random() * 30) + "%");
    document.body.style.setProperty("--fx-y", (35 + Math.random() * 30) + "%");
    playSound("explosion");
    $("fireLayer").classList.add("active");
    sparkBurst(window.innerWidth * 0.5, window.innerHeight * 0.48, "#ff8a2a", 70);
  } else if (type === "impact" || type === "shake") {
    playSound("impact");
  } else if (type === "glitch") {
    playSound("glitch");
  }
  void document.body.offsetWidth;
  document.body.classList.add(className);
  setTimeout(() => {
    document.body.classList.remove(className);
    if (type === "explosion") $("fireLayer").classList.remove("active");
  }, profile.settings.reducedMotion ? 80 : (type === "explosion" ? 950 : 460));
}

function ensureAudio() {
  if (!profile.settings.sound || audioContext) return;
  try {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (AudioCtor) audioContext = new AudioCtor();
  } catch (error) {
    profile.settings.sound = false;
    syncSettingsUI();
  }
}

function startBackgroundMusic() {
  if (!backgroundMusic || !profile.settings.sound) return;
  backgroundMusic.loop = true;
  backgroundMusic.volume = 0.22;
  const attempt = backgroundMusic.play();
  if (attempt && typeof attempt.catch === "function") attempt.catch(() => { /* aguarda o próximo gesto do jogador */ });
}

function pauseBackgroundMusic() {
  if (backgroundMusic) backgroundMusic.pause();
}

function tone(frequency, duration, volume, wave, delay, endFrequency) {
  if (!profile.settings.sound) return;
  ensureAudio();
  if (!audioContext) return;
  if (audioContext.state === "suspended") audioContext.resume();
  const start = audioContext.currentTime + (delay || 0);
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = wave || "sine";
  oscillator.frequency.setValueAtTime(frequency, start);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume || 0.035), start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

function playSound(name) {
  if (!profile.settings.sound) return;
  const sounds = {
    ui: [[520, .07, .025, "square"], [760, .06, .018, "square", .055]],
    start: [[180, .16, .035, "sawtooth", 0, 420], [620, .1, .02, "square", .12]],
    pull: [[110, .08, .035, "square", 0, 150]],
    error: [[105, .09, .03, "sawtooth", 0, 62]],
    success: [[360, .13, .025, "sine"], [540, .16, .03, "sine", .1], [810, .24, .025, "sine", .21]],
    fail: [[210, .18, .035, "sawtooth", 0, 90], [100, .28, .03, "square", .12, 48]],
    shot: [[820, .05, .028, "square", 0, 260], [120, .12, .02, "sawtooth", 0, 55]],
    miss: [[170, .07, .018, "square"]],
    memory: [[440, .09, .018, "sine"]],
    circuit: [[280, .07, .02, "square"], [520, .08, .015, "sine", .05]],
    drive: [[100, .06, .012, "sawtooth", 0, 130]],
    crash: [[80, .2, .06, "sawtooth", 0, 30]],
    impact: [[70, .18, .05, "sawtooth", 0, 32]],
    fire: [[95, .22, .018, "sawtooth", 0, 52]],
    explosion: [[65, .65, .085, "sawtooth", 0, 24], [160, .22, .04, "square", .02, 50]],
    alarm: [[190, .18, .045, "square"], [190, .18, .045, "square", .38], [190, .18, .045, "square", .76], [720, .08, .018, "sine", .2]],
    engine: [[55, .45, .035, "sawtooth", 0, 110], [130, .18, .018, "square", .32]],
    glitch: [[880, .08, .018, "square"], [120, .14, .03, "sawtooth", .08, 45]],
    jumpscare: [[45, .7, .1, "sawtooth", 0, 24], [980, .18, .045, "square", 0, 180]]
  };
  (sounds[name] || sounds.ui).forEach((args) => tone(...args));
}

const ambientCanvas = $("ambientCanvas");
const ambientContext = ambientCanvas.getContext("2d");
let canvasWidth = 0;
let canvasHeight = 0;
let canvasDpr = 1;
let ambientParticles = [];
let burstParticles = [];

function resizeCanvas() {
  canvasDpr = Math.min(1.5, window.devicePixelRatio || 1);
  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;
  ambientCanvas.width = Math.floor(canvasWidth * canvasDpr);
  ambientCanvas.height = Math.floor(canvasHeight * canvasDpr);
  ambientCanvas.style.width = canvasWidth + "px";
  ambientCanvas.style.height = canvasHeight + "px";
  ambientContext.setTransform(canvasDpr, 0, 0, canvasDpr, 0, 0);
  const count = canvasWidth < 650 ? 28 : 55;
  ambientParticles = Array.from({ length: count }, () => ({
    x: Math.random() * canvasWidth,
    y: Math.random() * canvasHeight,
    size: 0.5 + Math.random() * 1.6,
    speed: 4 + Math.random() * 14,
    alpha: 0.08 + Math.random() * 0.28
  }));
}

function sparkBurst(x, y, color, count) {
  if (profile.settings.reducedMotion) return;
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 55 + Math.random() * 260;
    burstParticles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      life: 0.35 + Math.random() * 0.8,
      maxLife: 1.15,
      size: 1 + Math.random() * 3,
      color
    });
  }
}

let lastCanvasFrame = performance.now();
function drawCanvas(now) {
  const dt = Math.min(0.035, (now - lastCanvasFrame) / 1000);
  lastCanvasFrame = now;
  ambientContext.clearRect(0, 0, canvasWidth, canvasHeight);
  if (!profile.settings.reducedMotion && !document.hidden) {
    ambientParticles.forEach((particle) => {
      particle.y -= particle.speed * dt;
      if (particle.y < -4) {
        particle.y = canvasHeight + 4;
        particle.x = Math.random() * canvasWidth;
      }
      ambientContext.fillStyle = "rgba(91,225,255," + particle.alpha + ")";
      ambientContext.fillRect(particle.x, particle.y, particle.size, particle.size * 3);
    });
    for (let i = burstParticles.length - 1; i >= 0; i -= 1) {
      const particle = burstParticles[i];
      particle.life -= dt;
      particle.vy += 210 * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      ambientContext.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ambientContext.fillStyle = particle.color;
      ambientContext.fillRect(particle.x, particle.y, particle.size * 2.5, particle.size);
      if (particle.life <= 0) burstParticles.splice(i, 1);
    }
    ambientContext.globalAlpha = 1;
  }
  requestAnimationFrame(drawCanvas);
}

function syncSettingsUI() {
  document.body.classList.toggle("reduce-motion", profile.settings.reducedMotion);
  $("btnSound").setAttribute("aria-pressed", String(profile.settings.sound));
  $("btnSound").querySelector("span").textContent = profile.settings.sound ? "◉" : "○";
  $("btnMotion").setAttribute("aria-pressed", String(profile.settings.reducedMotion));
  $("btnMotion").querySelector("span").textContent = profile.settings.reducedMotion ? "—" : "≋";
}

function validateGraph() {
  const errors = [];
  const minigameCount = new Set(Object.values(SCENES).filter((scene) => scene.mini).map((scene) => scene.mini.type)).size;
  Object.entries(SCENES).forEach(([id, scene]) => {
    (scene.choices || []).forEach((choice) => {
      if (typeof choice.to === "string" && !SCENES[choice.to]) errors.push(id + " -> " + choice.to);
      if (choice.ending && !ENDINGS[choice.ending]) errors.push(id + " -> final:" + choice.ending);
    });
    if (scene.mini) {
      ["win", "fail"].forEach((key) => {
        if (typeof scene.mini[key] === "string" && !SCENES[scene.mini[key]]) errors.push(id + " -> " + scene.mini[key]);
      });
    }
    if (scene.afterTruck && !SCENES[scene.afterTruck]) errors.push(id + " -> " + scene.afterTruck);
  });
  if (errors.length) console.error("NEXUS: destinos inválidos", errors);
  else console.info("NEXUS: grafo validado — " + Object.keys(SCENES).length + " cenas, 7 finais, " + minigameCount + " minigames.");
}

function trapModalFocus(event) {
  if (event.key !== "Tab") return;
  const modal = [...document.querySelectorAll(".modal:not(.hidden)")][0];
  if (!modal) return;
  const focusable = [...modal.querySelectorAll('button:not(:disabled),input:not(:disabled),[tabindex]:not([tabindex="-1"])')];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function init() {
  $("nick").value = profile.lastNick || "";
  syncSettingsUI();
  unlockAchievements(true);
  updateContinueButton();
  resizeCanvas();
  requestAnimationFrame(drawCanvas);
  validateGraph();

  const unlockMusic = () => {
    startBackgroundMusic();
    document.removeEventListener("pointerdown", unlockMusic);
    document.removeEventListener("keydown", unlockMusic);
  };
  document.addEventListener("pointerdown", unlockMusic, { once: true });
  document.addEventListener("keydown", unlockMusic, { once: true });
  backgroundMusic.addEventListener("ended", () => {
    backgroundMusic.currentTime = 0;
    startBackgroundMusic();
  });

  $("btnStart").addEventListener("click", startNewRun);
  $("btnContinue").addEventListener("click", continueRun);
  $("nick").addEventListener("keydown", (event) => { if (event.key === "Enter") startNewRun(); });
  $("btnSkipText").addEventListener("click", () => completeTyping(true));
  $("brandButton").addEventListener("click", showMenu);
  $("btnReplay").addEventListener("click", replay);
  $("btnEndingMenu").addEventListener("click", showMenu);

  $("btnSound").addEventListener("click", () => {
    profile.settings.sound = !profile.settings.sound;
    if (profile.settings.sound) {
      ensureAudio();
      startBackgroundMusic();
      playSound("ui");
    } else {
      pauseBackgroundMusic();
    }
    saveProfile();
    syncSettingsUI();
    toast(profile.settings.sound ? "Som ativado." : "Som desativado.");
  });
  $("btnMotion").addEventListener("click", () => {
    profile.settings.reducedMotion = !profile.settings.reducedMotion;
    saveProfile();
    syncSettingsUI();
    toast(profile.settings.reducedMotion ? "Efeitos intensos reduzidos." : "Efeitos completos ativados.");
  });
  $("btnAchievements").addEventListener("click", () => {
    renderArchive();
    openModal("achievementsModal");
  });
  $("btnCloseAchievements").addEventListener("click", () => closeModal("achievementsModal"));
  $("achievementsModal").addEventListener("pointerdown", (event) => {
    if (event.target === $("achievementsModal")) closeModal("achievementsModal");
  });

  $("btnRestart").addEventListener("click", () => openModal("confirmModal"));
  $("btnCancelRestart").addEventListener("click", () => closeModal("confirmModal"));
  $("btnConfirmRestart").addEventListener("click", () => {
    closeModal("confirmModal");
    const nick = game.nick;
    const diff = game.difficulty;
    game = createRun(nick, diff);
    profile.stats.runs += 1;
    saveProfile();
    enterGame();
    goTo("blackout", { initial: true });
  });

  document.addEventListener("keydown", (event) => {
    trapModalFocus(event);
    if (event.key === "Escape") {
      if (!$("achievementsModal").classList.contains("hidden")) closeModal("achievementsModal");
      else if (!$("confirmModal").classList.contains("hidden")) closeModal("confirmModal");
      return;
    }
    if (typingJob && (event.key === " " || event.key === "Enter") && !/INPUT|BUTTON/.test(document.activeElement.tagName)) {
      event.preventDefault();
      completeTyping(true);
      return;
    }
    if (!activeMini && !typingJob && !gamePaused && /^[1-9]$/.test(event.key) && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
      const buttons = [...$("choices").querySelectorAll("button:not(:disabled)")];
      const button = buttons[Number(event.key) - 1];
      if (button) button.click();
    }
  });
  window.addEventListener("resize", resizeCanvas, { passive: true });
}

init();
