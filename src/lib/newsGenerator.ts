// News generator and World Cup suggestions
import { findDerby } from '@/lib/presets';

const pick = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

export const generateNews = (teams: any[], teams2: any[], matchday: number, compType: string, compName: string, history?: any[], schedule?: any[][], cupPhase?: string) => {
  if (!teams || teams.length === 0) return [];

  const sorted = [...teams].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
  const sorted2 = teams2 && teams2.length > 0 ? [...teams2].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga)) : [];
  const news: any[] = [];
  const totalTeams = sorted.length;
  const usedIds = new Set<number>();
  const totalRounds = compType === 'league' ? (totalTeams - 1) * 2 : matchday + 5;
  const progress = matchday / totalRounds;
  const phase = progress < 0.25 ? 'early' : progress < 0.55 ? 'mid' : progress < 0.8 ? 'late' : 'final';
  const jLeft = totalRounds - matchday;

  const addNews = (item: any) => {
    if (item.team) usedIds.add(item.team.id);
    news.push(item);
  };

  // Helper: calcular rachas desde historial.
  // OJO: history[0] es la jornada MÁS RECIENTE (se hace unshift al simular).
  const resultFor = (teamId: number, day: any) => {
    const res = day?.results?.find((r: any) => r.hId === teamId || r.aId === teamId);
    if (!res || res.sh === null || res.sh === undefined || res.sa === null || res.sa === undefined) return null;
    const isHome = res.hId === teamId;
    const gf = isHome ? res.sh : res.sa;
    const ga = isHome ? res.sa : res.sh;
    return { res, isHome, gf, ga, outcome: gf > ga ? 'W' : gf === ga ? 'D' : 'L' };
  };

  const getStreak = (teamId: number) => {
    if (!history || history.length === 0) return { type: 'none', count: 0, results: '' };
    const seq: string[] = []; // seq[0] = partido más reciente
    for (let i = 0; i < history.length; i++) {
      const r = resultFor(teamId, history[i]);
      if (r) seq.push(r.outcome);
    }
    if (!seq.length) return { type: 'none', count: 0, results: '' };
    const type = seq[0];
    let count = 1;
    while (count < seq.length && seq[count] === type) count++;
    // results en orden cronológico real (antiguo -> reciente), últimos 5
    const results = seq.slice(0, 5).reverse().join('');
    return { type, count, results };
  };

  // Jornada más reciente y tabla previa a esa jornada (para detectar cambios de liderato)
  const lastDay = history && history.length > 0 ? history[0] : null;
  const lastDayLabel = lastDay?.day ? (typeof lastDay.day === 'number' ? `Jornada ${lastDay.day}` : String(lastDay.day)) : `Jornada ${matchday}`;

  const buildPrevTable = () => {
    if (!lastDay?.results || compType !== 'league') return null;
    const map = new Map<number, any>();
    teams.forEach(t => map.set(t.id, {
      id: t.id, name: t.name, pts: t.pts || 0, gf: t.gf || 0, ga: t.ga || 0,
      w: t.w || 0, d: t.d || 0, l: t.l || 0
    }));
    let touched = false;
    for (const r of lastDay.results) {
      const h = map.get(r.hId); const a = map.get(r.aId);
      if (!h || !a || r.sh === null || r.sh === undefined || r.sa === null || r.sa === undefined) continue;
      touched = true;
      h.gf -= r.sh; h.ga -= r.sa; a.gf -= r.sa; a.ga -= r.sh;
      if (r.sh > r.sa) { h.pts -= 3; h.w -= 1; a.l -= 1; }
      else if (r.sa > r.sh) { a.pts -= 3; a.w -= 1; h.l -= 1; }
      else { h.pts -= 1; a.pts -= 1; h.d -= 1; a.d -= 1; }
    }
    if (!touched) return null;
    return [...map.values()].sort((x, y) => y.pts - x.pts || ((y.gf - y.ga) - (x.gf - x.ga)) || y.gf - x.gf);
  };
  const prevTable = buildPrevTable();
  const prevPos = (teamId: number) => prevTable ? prevTable.findIndex(t => t.id === teamId) + 1 : 0;

  // ============================================================
  // === LO QUE PASÓ EN LA JORNADA (prioridad cronológica máxima) ===
  // ============================================================
  const teamById = (id: number) => teams.find(t => t.id === id) || (teams2 || []).find((t: any) => t.id === id);

  if (lastDay?.results && matchday > 0) {
    const rows = lastDay.results.filter((r: any) => r.sh !== null && r.sh !== undefined && r.sa !== null && r.sa !== undefined);

    // --- ¿PERDIÓ EL LIDERATO? ---
    if (compType === 'league' && prevTable && prevTable[0] && sorted[0] && prevTable[0].id !== sorted[0].id) {
      const oldLeader = teamById(prevTable[0].id);
      const newLeader = sorted[0];
      const oldRes = resultFor(prevTable[0].id, lastDay);
      const gap = newLeader.pts - (prevTable.find(t => t.id === prevTable[0].id)?.pts ?? 0);
      if (oldLeader && !usedIds.has(newLeader.id)) {
        addNews({
          title: `🚨 ¡CAMBIO DE LÍDER! ${newLeader.name} destrona al ${oldLeader.name}`,
          desc: `${lastDayLabel}: ${oldLeader.name} pierde el liderato que tenía y ${newLeader.name} se sienta en el trono con ${newLeader.pts} pts.${oldRes ? (oldRes.outcome === 'L' ? ` El ex-líder cayó ${oldRes.gf}-${oldRes.ga} y lo pagó carísimo.` : oldRes.outcome === 'D' ? ` Un empate (${oldRes.gf}-${oldRes.ga}) le costó la punta de la tabla.` : '') : ''} ${gap > 0 ? `Ahora manda por ${gap} punto(s).` : 'Se manda por diferencia de goles: liga al milímetro.'}`,
          team: newLeader, type: 'leadChange'
        });
        addNews({
          title: `😨 ${oldLeader.name} se queda sin liderato`,
          desc: `${lastDayLabel}: el que mandaba ya no manda. ${oldLeader.name} baja al puesto ${sorted.findIndex(t => t.id === oldLeader.id) + 1} y tendrá que remar desde atrás. ${phase === 'final' ? 'Perder la punta a estas alturas puede ser definitivo.' : 'Hay tiempo para recuperarla, pero el golpe es duro.'}`,
          team: oldLeader, type: 'leaderFall'
        });
      }
    }

    // --- EL PRIMER LUGAR HA PERDIDO (aunque siga líder) ---
    const leaderIdForCheck = prevTable?.[0]?.id ?? sorted[0]?.id;
    const leaderTeam = leaderIdForCheck ? teamById(leaderIdForCheck) : null;
    const leaderRes = leaderIdForCheck ? resultFor(leaderIdForCheck, lastDay) : null;
    if (leaderTeam && leaderRes && leaderRes.outcome === 'L' && !usedIds.has(leaderTeam.id)) {
      const rivalId = leaderRes.isHome ? leaderRes.res.aId : leaderRes.res.hId;
      const rival = teamById(rivalId);
      addNews({
        title: `💥 ¡EL LÍDER CAE! ${leaderTeam.name} pierde ${leaderRes.gf}-${leaderRes.ga}${rival ? ` ante ${rival.name}` : ''}`,
        desc: `${lastDayLabel}: el primer lugar se estrella. ${rival ? `${rival.name} dio el golpe de la fecha.` : 'Derrota inesperada.'} ${sorted[1] ? `El ${sorted[1].name} está a ${Math.max(0, sorted[0].pts - sorted[1].pts)} punto(s) y no piensa perdonar.` : ''} ${phase === 'late' || phase === 'final' ? 'A estas alturas del campeonato, estas derrotas se pagan con títulos.' : 'Aviso serio para el que va arriba.'}`,
        team: leaderTeam, type: 'leaderFall'
      });
    }

    // --- DERROTAS EN PARTIDOS IMPORTANTES (choques de arriba / duelos directos) ---
    if (compType === 'league' && prevTable) {
      const topCut = Math.max(4, Math.round(totalTeams * 0.3));
      const bigLosses = rows.map((r: any) => {
        if (r.sh === r.sa) return null;
        const homeWon = r.sh > r.sa;
        const loser = teamById(homeWon ? r.aId : r.hId);
        const winner = teamById(homeWon ? r.hId : r.aId);
        if (!loser || !winner) return null;
        const pl = prevPos(loser.id); const pw = prevPos(winner.id);
        if (!pl || !pw) return null;
        const isTopClash = pl <= topCut && pw <= topCut;
        const upset = pl <= topCut && pw > totalTeams - topCut;
        if (!isTopClash && !upset) return null;
        return { loser, winner, pl, pw, isTopClash, upset, gf: homeWon ? r.sh : r.sa, ga: homeWon ? r.sa : r.sh };
      }).filter(Boolean) as any[];

      bigLosses.sort((a, b) => (a.pl + a.pw) - (b.pl + b.pw));
      bigLosses.slice(0, 2).forEach(m => {
        if (usedIds.has(m.loser.id)) return;
        const diff = m.gf - m.ga;
        if (m.upset) {
          addNews({
            title: `😱 BATACAZO: ${m.loser.name} (${m.pl}º) cae ante ${m.winner.name} (${m.pw}º)`,
            desc: `${lastDayLabel}: ${m.gf}-${m.ga}. Un tropiezo que nadie esperaba y que le puede costar la temporada al ${m.loser.name}. En el fútbol de dados no hay favoritos garantizados: el colista de hoy es el verdugo de mañana.`,
            team: m.loser, type: 'bigLoss'
          });
        } else {
          addNews({
            title: `⚔️ DUELO DIRECTO: ${m.winner.name} gana ${m.gf}-${m.ga} y ${m.loser.name} pierde puntos de oro`,
            desc: `${lastDayLabel}: choque entre ${m.pw}º y ${m.pl}º de la tabla. ${diff >= 3 ? '¡Y encima con goleada! Un golpe anímico brutal.' : 'Se decidió por detalles, como todos los partidos grandes.'} ${m.loser.name} deja escapar una oportunidad enorme en la pelea de arriba.`,
            team: m.loser, type: 'bigLoss'
          });
        }
      });
    }
  }

  // === LIDERATO ===
  if (sorted[0] && sorted[0].pts > 0) {
    const L = sorted[0];
    const gap = sorted[1] ? L.pts - sorted[1].pts : 0;
    const dg = (L.gf || 0) - (L.ga || 0);
    const streak = getStreak(L.id);
    const streakText = streak.count >= 3 && streak.type === 'W' ? ` Racha de ${streak.count} victorias consecutivas que los hace intocables.` : '';
    const opts = phase === 'early' ? [
      { title: `🏆 ${L.name} arranca mandando`, desc: `${L.pts} pts tras ${matchday} jornadas. Arranque sólido con ${L.w || 0} triunfos.${streakText} Esto recién empieza, pero marcan el ritmo.` },
      { title: `📊 Buen inicio del ${L.name}`, desc: `Líderes tras la jornada ${matchday}. ${L.w || 0} victorias y +${dg} en gol diferencia.${streakText}` },
      { title: `⭐ ${L.name} toma la delantera`, desc: `${L.pts} puntos. Es pronto, pero el mensaje es claro: vienen con todo.${streakText}` },
      { title: `👑 ${L.name} se planta en la cima`, desc: `${L.w || 0}V ${L.d || 0}E ${L.l || 0}D. La temporada empieza y ellos ya mandan.${streakText}` },
    ] : phase === 'mid' ? [
      { title: `🏆 ${L.name} domina en el ecuador`, desc: `${L.pts} pts a mitad de temporada. ${gap > 3 ? `Ventaja de ${gap} sobre el segundo, colchón cómodo.` : 'Ventaja corta, pero el liderato es suyo.'}${streakText}` },
      { title: `📈 ${L.name} consolida a medio campeonato`, desc: `${L.w || 0} victorias en ${matchday} fechas. La regularidad es su arma.${streakText}` },
      { title: `💪 ${L.name} no afloja al llegar al ecuador`, desc: `+${dg} en diferencia de goles. Base sólida para la segunda vuelta.${streakText}` },
    ] : phase === 'late' ? [
      { title: `🏆 ${L.name} se aferra en la recta final`, desc: `${jLeft} jornadas y ${L.pts} pts. ${gap > 3 ? `${gap} de ventaja, dependen de sí mismos.` : 'Ventaja mínima, un tropiezo cambia todo.'}${streakText}` },
      { title: `🔥 ${L.name} resiste cuando más importa`, desc: `Cada punto vale doble a estas alturas. ${L.pts} unidades y la inercia de su lado.${streakText}` },
    ] : [
      { title: `🏆 ${L.name} acaricia el título`, desc: `${L.pts} pts a ${jLeft} fechas. ${gap > 0 ? `${gap} de ventaja. Lo tienen en la mano.` : 'Empatados en puntos. Final de película.'}${streakText}` },
      { title: `👑 ${L.name} a un paso de la gloria`, desc: `${L.w || 0} victorias que pueden valer un campeonato. ${jLeft} partidos para la eternidad.${streakText}` },
    ];
    addNews({ ...pick(opts), team: L, type: 'leader' });
  }

  // === CRISIS / ÚLTIMO ===
  const lastTeam = sorted[sorted.length - 1];
  if (lastTeam && matchday > 2 && !usedIds.has(lastTeam.id)) {
    const lastStreak = getStreak(lastTeam.id);
    const loseStreak = lastStreak.count >= 3 && lastStreak.type === 'L' ? ` Llevan ${lastStreak.count} derrotas seguidas... la moral por los suelos.` : '';
    const opts = phase === 'early' ? [
      { title: `😰 Mal arranque del ${lastTeam.name}`, desc: `Últimos con ${lastTeam.pts} pts tras ${matchday} jornadas. Queda liga, pero preocupa.${loseStreak}` },
      { title: `📉 ${lastTeam.name} empieza sufriendo`, desc: `${lastTeam.l || 0} derrotas en el arranque. El técnico ya siente la presión.${loseStreak}` },
    ] : phase === 'mid' ? [
      { title: `🚨 ${lastTeam.name} en el fondo al ecuador`, desc: `${lastTeam.pts} pts a mitad de temporada. La segunda vuelta tiene que ser otra historia.${loseStreak}` },
      { title: `💔 ${lastTeam.name} no levanta cabeza`, desc: `${lastTeam.w || 0} victorias en media temporada. La reacción no llega.${loseStreak}` },
    ] : phase === 'late' ? [
      { title: `⚠️ ${lastTeam.name}: el tiempo se agota`, desc: `Últimos con ${lastTeam.pts} pts y ${jLeft} jornadas. Desesperante.${loseStreak}` },
      { title: `🆘 Cuenta regresiva para ${lastTeam.name}`, desc: `${lastTeam.l || 0} derrotas pesan. ${jLeft} partidos para el milagro.${loseStreak}` },
    ] : [
      { title: `😱 ${lastTeam.name}: últimos en la definición`, desc: `${lastTeam.pts} pts a ${jLeft} fechas. Prácticamente sentenciados.${loseStreak}` },
      { title: `🪦 Final amargo para ${lastTeam.name}`, desc: `${lastTeam.w || 0}V ${lastTeam.d || 0}E ${lastTeam.l || 0}D. Números duros cuando todo se define.${loseStreak}` },
    ];
    addNews({ ...pick(opts), team: lastTeam, type: 'crisis' });
  }

  // === RACHA EN LLAMAS (3+ victorias seguidas) ===
  if (matchday >= 3) {
    const hotTeams = sorted.filter(t => !usedIds.has(t.id) && getStreak(t.id).type === 'W' && getStreak(t.id).count >= 3);
    if (hotTeams.length > 0) {
      const hot = pick(hotTeams);
      const s = getStreak(hot.id);
      const formStr = s.results.split('').map(r => r === 'W' ? '✅' : r === 'D' ? '🟡' : '🔴').join('');
      addNews({ title: `🔥 ${hot.name} EN RACHA: ${s.count} victorias al hilo`, desc: `Forma: ${formStr}. El momentum está de su lado. Cuando un equipo entra en esta dinámica, los rivales tiemblan. ${phase === 'late' || phase === 'final' ? 'Y justo en el momento más importante de la temporada.' : 'Si mantienen este nivel, van a ser protagonistas.'}`, team: hot, type: 'momentum' });
    }
  }

  // === MOMENTUM NEGATIVO (3+ derrotas seguidas, no repetir con crisis) ===
  if (matchday >= 3) {
    const coldTeams = sorted.filter(t => !usedIds.has(t.id) && getStreak(t.id).type === 'L' && getStreak(t.id).count >= 3);
    if (coldTeams.length > 0) {
      const cold = pick(coldTeams);
      const s = getStreak(cold.id);
      const formStr = s.results.split('').map(r => r === 'W' ? '✅' : r === 'D' ? '🟡' : '🔴').join('');
      addNews({ title: `📉 ${cold.name} en caída libre: ${s.count} derrotas consecutivas`, desc: `Forma: ${formStr}. La confianza se evapora partido a partido. ${cold.pts > sorted[sorted.length - 1].pts + 3 ? 'Aún tienen colchón en la tabla, pero si no reaccionan...' : 'Y la tabla no perdona. Necesitan un golpe de timón urgente.'}`, team: cold, type: 'crisis' });
    }
  }

  // === FACTOR DADO / SUERTE ===
  if (matchday >= 2) {
    // Equipos con att bajo pero muchos goles (suerte en los dados)
    const luckyTeams = sorted.filter(t => t && !usedIds.has(t.id) && (t.att || 3) <= 3 && (t.gf || 0) > matchday * 1.3);
    const unluckyTeams = sorted.filter(t => t && !usedIds.has(t.id) && (t.att || 3) >= 4 && matchday > 0 && (t.gf || 0) < matchday * 0.7);

    if (luckyTeams.length > 0) {
      const lucky = pick(luckyTeams);
      const gpm = ((lucky.gf || 0) / matchday).toFixed(1);
      addNews({ ...pick([
        { title: `🎲 ¡Los dados sonríen al ${lucky.name}!`, desc: `ATT ${lucky.att || 3} pero ${lucky.gf} goles (${gpm}/partido). El azar les está dando la mano. En el fútbol de dados, a veces la suerte es la mejor táctica.` },
        { title: `🍀 ${lucky.name}: el factor suerte existe`, desc: `Con un ataque modesto (ATT ${lucky.att || 3}) llevan ${lucky.gf} goles. Los dados han rodado a su favor y lo están aprovechando. ¿Cuánto durará la racha?` },
        { title: `✨ La fortuna del dado sonríe al ${lucky.name}`, desc: `${lucky.gf} goles con ATT ${lucky.att || 3}. En este juego, el dado manda, y últimamente el dado quiere a este equipo.` },
      ]), team: lucky, type: 'luck' });
    } else if (unluckyTeams.length > 0) {
      const unlucky = pick(unluckyTeams);
      const gpm = ((unlucky.gf || 0) / matchday).toFixed(1);
      addNews({ ...pick([
        { title: `🎲 Los dados le dan la espalda al ${unlucky.name}`, desc: `ATT ${unlucky.att || 3} pero solo ${unlucky.gf} goles (${gpm}/partido). Tienen el potencial, pero el dado no coopera. La mala suerte también es parte del juego.` },
        { title: `😤 ${unlucky.name} pide que cambien los dados`, desc: `Con ATT ${unlucky.att || 3} esperaban más, pero solo llevan ${unlucky.gf} goles. El azar no entiende de estadísticas.` },
        { title: `🔮 El dado castiga al ${unlucky.name}`, desc: `Solo ${gpm} goles/partido con un ataque de nivel ${unlucky.att || 3}. A veces, la suerte simplemente no está de tu lado.` },
      ]), team: unlucky, type: 'luck' });
    }
  }

  // === PREVIA DE PARTIDO: DERBY / CLÁSICO / PARTIDO INTERESANTE ===
  if (schedule && schedule[matchday]) {
    const nextRound = schedule[matchday];
    let bestMatch: any = null;
    let bestScore = 0;
    let bestDerby: any = null;

    for (const m of nextRound) {
      const h = sorted.find(t => t.id === m.homeId);
      const a = sorted.find(t => t.id === m.awayId);
      if (!h || !a) continue;
      const hRank = sorted.indexOf(h);
      const aRank = sorted.indexOf(a);
      const derby = findDerby(h.name, a.name);
      let score = 0;
      if (derby) score += 15 + derby.intensity * 3; // derbys tienen máxima prioridad
      if (hRank < 4 && aRank < 4) score += 10;
      if (hRank < 2 || aRank < 2) score += 5;
      const hStreak = getStreak(h.id);
      const aStreak = getStreak(a.id);
      if (hStreak.type === 'W' && hStreak.count >= 2) score += 3;
      if (aStreak.type === 'W' && aStreak.count >= 2) score += 3;
      if (hStreak.type === 'W' && aStreak.type === 'L') score += 4;
      if (aStreak.type === 'W' && hStreak.type === 'L') score += 4;
      if (Math.abs(hRank - aRank) <= 2 && hRank < totalTeams / 2) score += 2;
      if (score > bestScore) { bestScore = score; bestMatch = { h, a, hStreak, aStreak }; bestDerby = derby; }
    }

    if (bestMatch && bestScore >= 3 && !usedIds.has(bestMatch.h.id) && !usedIds.has(bestMatch.a.id)) {
      const { h, a, hStreak, aStreak } = bestMatch;
      const hPos = sorted.indexOf(h) + 1;
      const aPos = sorted.indexOf(a) + 1;
      const hForm = hStreak.results.slice(0, 4).split('').map(r => r === 'W' ? '✅' : r === 'D' ? '🟡' : '🔴').join('');
      const aForm = aStreak.results.slice(0, 4).split('').map(r => r === 'W' ? '✅' : r === 'D' ? '🟡' : '🔴').join('');
      const formText = (hForm || aForm) ? ` Forma: ${h.name} ${hForm || '—'} vs ${aForm || '—'} ${a.name}.` : '';

      if (bestDerby) {
        // ¡ES UN DERBY O CLÁSICO!
        const d = bestDerby;
        const ptsDiff = Math.abs(h.pts - a.pts);
        const bothTop = hPos <= 5 && aPos <= 5;
        const titleRace = ptsDiff <= 6 && bothTop;
        const cupContext = compType !== 'league';

        const derbyOpts = [
          { title: `${d.emoji} ¡${d.name}! ${h.name} vs ${a.name}`, desc: `¡SE VIENE EL PARTIDO MÁS ESPERADO! ${d.name} en la jornada ${matchday + 1}. ${titleRace ? `¡Y con pelea por el título! Solo ${ptsDiff} puntos separan a estos rivales en la tabla.` : `Cuando estos dos se enfrentan, la tabla no importa. Es puro orgullo, pura rivalidad.`}${formText} ¡No hay favoritos en un derby!` },
          { title: `${d.emoji} ALERTA DERBY: ${d.name} — J${matchday + 1}`, desc: `${h.name} (${hPos}º) recibe al ${a.name} (${aPos}º). ${d.intensity >= 5 ? 'El partido más caliente del calendario. La rivalidad se siente en cada rincón.' : 'Un clásico que siempre da espectáculo.'} ${hStreak.count >= 3 && hStreak.type === 'W' ? `${h.name} llega con ${hStreak.count} victorias seguidas, ¿lo notarán los rivales?` : aStreak.count >= 3 && aStreak.type === 'W' ? `${a.name} viene en racha de ${aStreak.count} triunfos. Peligro.` : 'Todo puede pasar.'}${formText}` },
          { title: `${d.emoji} ${d.name}: ¡LA CIUDAD TIEMBLA!`, desc: `¡${h.name} vs ${a.name}! Se paraliza todo. ${phase === 'final' ? '¡Y en la recta final de la temporada! Cada punto vale doble en un derby así.' : phase === 'late' ? 'En plena fase decisiva, un derby puede cambiar el rumbo de la temporada.' : 'La rivalidad no entiende de estadísticas ni de momentos.'} ${bothTop ? 'Ambos en la parte alta, duelo directo con implicaciones.' : 'No importa la tabla cuando suena el himno de este derby.'}${formText}` },
        ];
        if (cupContext) {
          derbyOpts.push({ title: `${d.emoji} ¡${d.name} EN ELIMINATORIA!`, desc: `¡INCREÍBLE! El sorteo ha emparejado a ${h.name} y ${a.name} en la ${compName}. ¡${d.name} en formato de copa, sin red, sin margen de error! El que pierda, a casa. El que gane, leyenda. ¡Esto es de película!` });
        }
        addNews({ ...pick(derbyOpts), team: h, type: 'derby' });
      } else if (hPos <= 3 && aPos <= 3) {
        addNews({ ...pick([
          { title: `🔜 PREVIA: ${h.name} vs ${a.name} — ¡Duelo de titanes!`, desc: `¡${hPos}º contra ${aPos}º! Un choque que puede definir el campeonato. ${h.pts} pts vs ${a.pts} pts.${formText} Jornada ${matchday + 1}. Esto es lo que los aficionados esperan. ¡Imperdible!` },
          { title: `⚡ ¡PARTIDAZO! ${h.name} recibe al ${a.name}`, desc: `Dos colosos frente a frente en la jornada ${matchday + 1}. ${Math.abs(h.pts - a.pts) <= 3 ? '¡Separados por nada! El que gane se lleva mucho más que 3 puntos.' : 'Ambos en la élite de la tabla.'}${formText} El ambiente va a ser ELÉCTRICO.` },
        ]), team: h, type: 'preview' });
      } else {
        const ptsDiff = Math.abs(h.pts - a.pts);
        addNews({ ...pick([
          { title: `🔜 PREVIA J${matchday + 1}: ${h.name} vs ${a.name}`, desc: `${hPos}º vs ${aPos}º. ${hStreak.count >= 2 && hStreak.type === 'W' ? `${h.name} llega enrachado.` : aStreak.count >= 2 && aStreak.type === 'W' ? `${a.name} llega con el viento a favor.` : 'Ambos necesitan los tres puntos.'}${formText}` },
          { title: `📋 Ojo a la jornada ${matchday + 1}: ${h.name} - ${a.name}`, desc: `Cruce interesante en la próxima fecha.${formText} ${ptsDiff <= 3 ? 'Separados por poco en la tabla, cada punto cuenta.' : ''}` },
        ]), team: h, type: 'preview' });
      }
    }

    // === SEGUNDO DERBY si hay otro en la jornada ===
    if (bestDerby) {
      for (const m of nextRound) {
        const h2 = sorted.find(t => t.id === m.homeId);
        const a2 = sorted.find(t => t.id === m.awayId);
        if (!h2 || !a2 || usedIds.has(h2.id) || usedIds.has(a2.id)) continue;
        const derby2 = findDerby(h2.name, a2.name);
        if (derby2 && derby2 !== bestDerby) {
          addNews({
            title: `${derby2.emoji} ¡También se juega el ${derby2.name}!`,
            desc: `¡Jornada de derbys! ${h2.name} vs ${a2.name}. ${derby2.name} en la misma fecha. Cuando la rivalidad se multiplica, la emoción se desborda.`,
            team: h2, type: 'derby'
          });
          break;
        }
      }
    }
  }

  // === DERBY JUGADO (revisar último partido del historial) ===
  if (lastDay && matchday > 0) {
    if (lastDay?.results) {
      for (const res of lastDay.results) {
        const hTeam = sorted.find(t => t.id === res.hId);
        const aTeam = sorted.find(t => t.id === res.aId);
        if (!hTeam || !aTeam || usedIds.has(hTeam.id) || usedIds.has(aTeam.id)) continue;
        const derby = findDerby(hTeam.name, aTeam.name);
        if (derby) {
          const scoreLine = `${res.sh}-${res.sa}`;
          const winner = res.sh > res.sa ? hTeam : res.sa > res.sh ? aTeam : null;
          const loser = res.sh > res.sa ? aTeam : res.sa > res.sh ? hTeam : null;
          const goalDiff = Math.abs(res.sh - res.sa);
          if (winner) {
            addNews({
              title: `${derby.emoji} ¡${winner.name} SE LLEVA EL ${derby.name.toUpperCase()}! (${scoreLine})`,
              desc: `${goalDiff >= 3 ? `¡GOLEADA HISTÓRICA! ${winner.name} destroza al ${loser!.name} por ${scoreLine}. Una humillación que tardará en olvidarse.` : goalDiff === 1 ? `¡Victoria agónica! ${winner.name} saca adelante el derby por la mínima. ${loser!.name} se queda con la miel en los labios.` : `${winner.name} se impone con autoridad. El ${derby.name} tiene dueño... por ahora.`} ¡Los aficionados del ${winner.name} estallan de alegría!`,
              team: winner, type: 'derby'
            });
          } else {
            addNews({
              title: `${derby.emoji} ${derby.name}: ¡EMPATE ÉPICO! (${scoreLine})`,
              desc: `${res.sh === 0 ? `Sin goles pero con MUCHA intensidad. ${hTeam.name} y ${aTeam.name} se neutralizan en un ${derby.name} táctico y tenso.` : `¡${res.sh} goles por lado! ${derby.name} de ida y vuelta donde ninguno quiso ceder. Punto que puede saber a poco para ambos.`} La rivalidad sigue más viva que nunca.`,
              team: hTeam, type: 'derby'
            });
          }
          break; // solo 1 noticia de derby jugado
        }
      }
    }
  }

  // === ZONA DE DESCENSO ===
  if (compType === 'league' && totalTeams >= 18 && matchday > 1) {
    const relegTeam = pick(sorted.slice(-3).filter(t => !usedIds.has(t.id)));
    if (relegTeam) {
      const rStreak = getStreak(relegTeam.id);
      const formStr = rStreak.results.slice(0, 5).split('').map(r => r === 'W' ? '✅' : r === 'D' ? '🟡' : '🔴').join('');
      const opts = phase === 'early' ? [
        { title: `⬇️ ${relegTeam.name} en zona roja`, desc: `${relegTeam.pts} pts. Forma: ${formStr || '—'}. Es temprano, pero nadie quiere acostumbrarse al fondo.` },
      ] : phase === 'mid' ? [
        { title: `⬇️ ${relegTeam.name}: media liga en descenso`, desc: `${relegTeam.pts} pts al ecuador. Forma: ${formStr || '—'}. La segunda vuelta tiene que ser otra cosa.` },
      ] : phase === 'late' ? [
        { title: `⬇️ Alarma para ${relegTeam.name}`, desc: `${jLeft} jornadas y en zona de bajada. Forma: ${formStr || '—'}. El margen se reduce cada semana.` },
        { title: `⏳ ${relegTeam.name}: cada partido es una final`, desc: `En puestos de descenso en la recta final. ${relegTeam.w || 0} victorias no alcanzan. Forma: ${formStr || '—'}.` },
      ] : [
        { title: `🆘 ${relegTeam.name}: el descenso acecha`, desc: `A ${jLeft} jornadas, con ${relegTeam.pts} pts... Forma: ${formStr || '—'}. Las matemáticas son crueles.` },
      ];
      addNews({ ...pick(opts), team: relegTeam, type: 'relegation' });
    }
  }

  // === ASCENSO ===
  if (sorted2.length > 0 && matchday > 1) {
    const promoTeam = pick(sorted2.slice(0, Math.min(3, sorted2.length)).filter(t => !usedIds.has(t.id)));
    if (promoTeam) {
      const opts = phase === 'early' ? [
        { title: `⬆️ ${promoTeam.name} empieza bien en 2ª`, desc: `${promoTeam.pts} pts en las primeras jornadas. Si mantienen el nivel, el ascenso es real.` },
      ] : phase === 'mid' ? [
        { title: `⬆️ ${promoTeam.name} fuerte al ecuador en segunda`, desc: `${promoTeam.pts} pts a medio campeonato. La afición empieza a soñar con Primera.` },
      ] : phase === 'late' ? [
        { title: `🚀 ${promoTeam.name} aprieta por el ascenso`, desc: `${jLeft} jornadas y con ${promoTeam.pts} pts en zona de promoción. El sueño de Primera se siente cerca.` },
      ] : [
        { title: `🌟 ${promoTeam.name} a un paso de Primera`, desc: `Últimas fechas y en puestos de ascenso. ${promoTeam.pts} pts. La ciudad entera contiene la respiración.` },
      ];
      addNews({ ...pick(opts), team: promoTeam, type: 'promotion' });
    }
  }

  // === ATAQUE LETAL (ATT >= 5) ===
  const offensiveBeasts = teams.filter(t => t && (t.att || 0) >= 5 && !usedIds.has(t.id));
  if (offensiveBeasts.length > 0) {
    const beast = pick(offensiveBeasts);
    const gpm = matchday > 0 ? ((beast.gf || 0) / matchday).toFixed(1) : '0';
    addNews({ ...pick([
      { title: `⚔️ Poder ofensivo del ${beast.name}: nivel máximo`, desc: `ATT 5 y ${beast.gf || 0} goles (${gpm}/partido). ${phase === 'final' ? 'A estas alturas, su artillería es letal.' : 'Generan peligro constante.'}` },
      { title: `💥 ${beast.name}: la delantera más temida`, desc: `${beast.gf || 0} goles en ${matchday} jornadas. Cuando el dado acompaña a un ATT de 5, el resultado es demoledor.` },
    ]), team: beast, type: 'stats' });
  }

  // === MURO DEFENSIVO (DEF >= 5) ===
  const walls = teams.filter(t => t && (t.def || 0) >= 5 && !usedIds.has(t.id));
  if (walls.length > 0) {
    const wall = pick(walls);
    const gapm = matchday > 0 ? ((wall.ga || 0) / matchday).toFixed(1) : '0';
    addNews({ ...pick([
      { title: `🛡️ ${wall.name}: muro defensivo`, desc: `Solo ${wall.ga || 0} goles en contra (${gapm}/partido). DEF 5 que se nota. ${phase === 'late' || phase === 'final' ? 'En la recta final, esa solidez vale oro.' : ''}` },
      { title: `🧱 ${wall.name} no regala nada atrás`, desc: `${wall.ga || 0} goles recibidos. Los rivales se estrellan contra su línea de fondo.` },
    ]), team: wall, type: 'defense' });
  }

  // === MÁXIMO GOLEADOR ===
  const topScorer = [...teams].sort((a, b) => (b.gf || 0) - (a.gf || 0))[0];
  if (topScorer && (topScorer.gf || 0) > 3 && !usedIds.has(topScorer.id)) {
    addNews({ ...pick([
      { title: `⚽ ${topScorer.name} lidera con ${topScorer.gf} goles`, desc: `${phase === 'early' ? 'En apenas unas jornadas, ya son los máximos anotadores.' : phase === 'final' ? 'En la definición, cada gol de más puede valer un título.' : `Jornada ${matchday} y nadie ha metido más.`}` },
      { title: `🥅 ${topScorer.name} hace vibrar las redes`, desc: `${topScorer.gf} tantos. ${phase === 'late' ? 'Argumentos de sobra para pelear arriba.' : 'Vocación ofensiva.'}` },
    ]), team: topScorer, type: 'scorer' });
  }

  // === RIVALIDAD (2º vs 1º) ===
  if (sorted[1] && sorted[0] && sorted[0].pts - sorted[1].pts <= 3 && matchday > 2 && !usedIds.has(sorted[1].id)) {
    const ch = sorted[1];
    const diff = sorted[0].pts - ch.pts;
    const chStreak = getStreak(ch.id);
    const leaderStreak = getStreak(sorted[0].id);
    const momentumText = chStreak.type === 'W' && chStreak.count >= 2 ? ` Y el ${ch.name} viene en racha de ${chStreak.count} victorias...` : leaderStreak.type === 'L' ? ` Y el líder viene de perder...` : '';
    const opts = phase === 'early' ? [
      { title: `🔥 ${ch.name} pisa los talones al líder`, desc: `${diff === 0 ? 'Empatados en puntos.' : `Solo ${diff} punto(s).`} Liga apretada desde el arranque.${momentumText}` },
    ] : phase === 'mid' ? [
      { title: `⚡ ${ch.name} no se despega del ${sorted[0].name}`, desc: `${diff} punto(s) al ecuador. La segunda vuelta será guerra por el título.${momentumText}` },
      { title: `🥊 Duelo en la cima: ${ch.name} vs ${sorted[0].name}`, desc: `${ch.pts} vs ${sorted[0].pts} pts. La pelea se define en los detalles.${momentumText}` },
    ] : phase === 'late' ? [
      { title: `🌡️ La liga hierve: ${ch.name} acecha`, desc: `${jLeft} jornadas, ${diff} punto(s). Cada tropiezo cambia todo.${momentumText}` },
    ] : [
      { title: `🔥 ${ch.name} a ${diff} punto(s) del título`, desc: `${jLeft} jornadas. Diferencia mínima. Cualquier resultado da un vuelco.${momentumText}` },
    ];
    addNews({ ...pick(opts), team: ch, type: 'rivalry' });
  }

  // === CAMBIO DE LÍDER / PÉRDIDA DE LIDERAZGO ===
  if (history && history.length >= 2 && matchday >= 2 && compType === 'league') {
    // Reconstruir la tabla de la jornada anterior para detectar cambio de líder
    const prevDay = lastDay;
    if (prevDay?.results) {
      // Simulamos: si el líder actual perdió o empató en la última jornada, puede haber habido cambio
      const leaderStreak = getStreak(sorted[0].id);
      const leaderLastResult = prevDay.results.find((r: any) => r.hId === sorted[0].id || r.aId === sorted[0].id);

      if (leaderLastResult) {
        const wasHome = leaderLastResult.hId === sorted[0].id;
        const leaderGoals = wasHome ? leaderLastResult.sh : leaderLastResult.sa;
        const rivalGoals = wasHome ? leaderLastResult.sa : leaderLastResult.sh;
        const leaderWon = leaderGoals > rivalGoals;
        const leaderLost = leaderGoals < rivalGoals;
        const leaderDrew = leaderGoals === rivalGoals;

        // Si el segundo está a 0-2 pts y el líder NO ganó → posible cambio de líder dramático
        const gap = sorted[0].pts - (sorted[1]?.pts || 0);

        if (leaderLost && gap <= 3 && sorted[1] && !usedIds.has(sorted[1].id)) {
          const newChallenger = sorted[1];
          const spicyOpts = [
            { title: `💥 ¡${sorted[0].name} TROPIEZA! ¿Se les escapa la Liga?`, desc: `El líder perdió en la última jornada y ${newChallenger.name} se le planta a ${gap} punto(s). ${gap === 0 ? '¡EMPATE EN LA CIMA! Esto se pone al rojo vivo.' : `La ventaja se reduce. ${newChallenger.name} huele sangre.`} ${leaderStreak.type === 'L' && leaderStreak.count >= 2 ? `¡Y van ${leaderStreak.count} derrotas seguidas! La crisis es real.` : 'Un tropiezo que puede costar carísimo.'}` },
            { title: `😱 Terremoto en la tabla: ${sorted[0].name} pierde y el liderato tiembla`, desc: `Derrota que duele. ${newChallenger.name} está a solo ${gap} punto(s). ${phase === 'final' ? 'A estas alturas, perder no es un tropiezo: es un drama.' : phase === 'late' ? 'En la recta final, estos puntos no se recuperan fácil.' : 'Todavía hay margen, pero la presión aumenta.'}` },
            { title: `🔻 ${sorted[0].name} afloja y ${newChallenger.name} aprieta`, desc: `Los de arriba pierden y los de abajo sonríen. Solo ${gap} punto(s) separan al 1º del 2º. ${gap === 0 ? '¡Liga igualada al milímetro!' : 'La tabla se comprime y cualquiera puede ser líder la próxima jornada.'} Dicen que las ligas se ganan con regularidad... ${sorted[0].name} acaba de perder una dosis de eso.` },
          ];
          addNews({ ...pick(spicyOpts), team: sorted[0], type: 'rivalry' });
        } else if (leaderDrew && gap <= 2 && sorted[1] && !usedIds.has(sorted[1].id)) {
          addNews({ ...pick([
            { title: `🤨 ${sorted[0].name} empata y deja la puerta abierta`, desc: `El líder solo suma uno. ${sorted[1].name} está a ${gap} punto(s). Un empate que sabe a derrota cuando te persiguen de cerca. ${phase === 'late' || phase === 'final' ? 'En esta fase, cada punto que dejas es un regalo para tus rivales.' : ''}` },
            { title: `😤 Empate amargo del ${sorted[0].name}`, desc: `2 puntos que se escapan. Con ${sorted[1].name} a ${gap} punto(s), estos empates se pagan caros. ${sorted[0].name} necesita volver a ganar o su ventaja será solo un recuerdo.` },
          ]), team: sorted[0], type: 'rivalry' });
        }
      }
    }
  }

  // === MULTI-LÍDER: Varios equipos empatados en puntos arriba ===
  if (matchday >= 2 && sorted.length >= 3 && compType === 'league') {
    const topPts = sorted[0].pts;
    const tiedAtTop = sorted.filter(t => t.pts === topPts);
    if (tiedAtTop.length >= 3 && topPts > 0) {
      const names = tiedAtTop.slice(0, 4).map(t => t.name);
      const nameStr = names.length <= 3 ? names.join(', ') : names.slice(0, 3).join(', ') + ` y ${names.length - 3} más`;
      addNews({ ...pick([
        { title: `🏁 ¡${tiedAtTop.length} equipos empatados en la cima!`, desc: `${nameStr} — todos con ${topPts} puntos. Esto es una locura. La igualdad es máxima y la diferencia de goles decide quién manda. ¿Cuántas jornadas aguantará este empate masivo?` },
        { title: `⚡ Liga de locos: ${tiedAtTop.length} líderes con ${topPts} pts`, desc: `${nameStr}. Nadie consigue despegarse. ${phase === 'late' || phase === 'final' ? 'Y en plena recta final... esto es un infarto colectivo.' : 'La competición más igualada que se recuerda.'} ¿Quién romperá el empate?` },
        { title: `🎭 ¡Empate masivo arriba! ${tiedAtTop.length} equipos pelean por 1 trono`, desc: `${nameStr}. Todos con ${topPts} pts. La liga no quiere un favorito, quiere DRAMA. Y lo está consiguiendo.` },
      ]), team: tiedAtTop[0], type: 'leader' });
    } else if (tiedAtTop.length === 2 && topPts > 0 && !usedIds.has(tiedAtTop[1].id)) {
      const [a, b] = tiedAtTop;
      const dgA = (a.gf || 0) - (a.ga || 0);
      const dgB = (b.gf || 0) - (b.ga || 0);
      addNews({ ...pick([
        { title: `🤝 ${a.name} y ${b.name}: co-líderes con ${topPts} pts`, desc: `Empate perfecto en la cima. ${dgA > dgB ? `${a.name} manda por diferencia de goles (+${dgA} vs +${dgB}).` : dgB > dgA ? `${b.name} tiene mejor diferencia de goles (+${dgB} vs +${dgA}).` : '¡Hasta la diferencia de goles es igual!'} ${phase === 'final' ? 'En las últimas jornadas, esto es dinamita pura.' : 'La liga se decide en los detalles.'}` },
        { title: `👀 Dos gallos para un corral: ${a.name} y ${b.name}`, desc: `Ambos con ${topPts} puntos. ${phase === 'late' ? 'El que pestañee, pierde.' : 'La liga tiene dos dueños. Pero al final, solo puede quedar uno.'} ¿Quién aguantará la presión?` },
      ]), team: a, type: 'leader' });
    }
  }

  // === FRASES PICANTES / PROVOCADORAS (aleatoriamente) ===
  if (matchday >= 3 && Math.random() > 0.6) {
    // Equipo grande en posición baja
    const bigTeams = sorted.filter(t => t && (((t.att || 0) >= 4 && (t.opp || 0) >= 4) || (t.att || 0) >= 5));
    const bigTeamLow = bigTeams.find(t => {
      const pos = sorted.indexOf(t) + 1;
      return pos > totalTeams * 0.5 && !usedIds.has(t.id);
    });

    // Equipo modesto arriba
    const modestTeamHigh = sorted.slice(0, Math.max(3, Math.floor(totalTeams * 0.2))).find(t =>
      t && ((t.att || 0) <= 3 && (t.def || 0) <= 3) && !usedIds.has(t.id)
    );

    if (bigTeamLow && modestTeamHigh) {
      addNews({ ...pick([
        { title: `🌶️ ${modestTeamHigh.name} por encima del ${bigTeamLow.name}... ¡Sí, en serio!`, desc: `El fútbol de dados no entiende de presupuestos. ${modestTeamHigh.name} (${sorted.indexOf(modestTeamHigh) + 1}º) está por delante de ${bigTeamLow.name} (${sorted.indexOf(bigTeamLow) + 1}º). Los millones no ruedan el dado. A veces la humildad gana a la soberbia.` },
        { title: `😏 ¿Dónde está el ${bigTeamLow.name}? Pregunta seria`, desc: `Con plantilla de ATT ${bigTeamLow.att} y OPP ${bigTeamLow.opp} están en el puesto ${sorted.indexOf(bigTeamLow) + 1}. Mientras tanto, el ${modestTeamHigh.name} con ATT ${modestTeamHigh.att} está ${sorted.indexOf(modestTeamHigh) + 1}º. El dado es democrático... o despiadado.` },
      ]), team: bigTeamLow, type: 'surprise' });
    } else if (bigTeamLow) {
      const pos = sorted.indexOf(bigTeamLow) + 1;
      addNews({ ...pick([
        { title: `💀 ${bigTeamLow.name} en el puesto ${pos}... ¿esto es una broma?`, desc: `ATT ${bigTeamLow.att}, OPP ${bigTeamLow.opp || '?'}, presupuesto de campeón... y en la mitad baja de la tabla. El banquillo tiembla, la afición protesta, y el dado se ríe. A veces el fútbol (de dados) no tiene piedad.` },
        { title: `🗣️ La afición del ${bigTeamLow.name} pide explicaciones`, desc: `Puesto ${pos}. Con ese plantel, estar ahí abajo es un escándalo. ¿Mala suerte con los dados o falta de algo más? El debate está servido.` },
      ]), team: bigTeamLow, type: 'crisis' });
    }
  }


  if (compType !== 'league' && matchday > 0) {
    const roundLabel = (ph?: string) => ph === 'groups' ? 'Fase de grupos'
      : ph === 'Octavos' ? 'Octavos de final'
      : ph === 'Cuartos' ? 'Cuartos de final'
      : ph === 'Semis' ? 'Semifinales'
      : ph === 'Final' ? 'La Gran Final'
      : 'la eliminatoria';
    const playedLabel = lastDayLabel; // ronda que se acaba de jugar
    const nextLabel = roundLabel(cupPhase); // ronda vigente ahora mismo

    // --- CRÓNICA DE LA RONDA QUE SE ACABA DE JUGAR ---
    const rows = (lastDay?.results || []).filter((r: any) => r.sh !== null && r.sh !== undefined && r.sa !== null && r.sa !== undefined);
    if (rows.length) {
      // Partido más goleador de la jornada
      const topGame = [...rows].sort((a: any, b: any) => ((b.sh + b.sa) - (a.sh + a.sa)))[0];
      const tgH = teamById(topGame.hId); const tgA = teamById(topGame.aId);
      if (tgH && tgA) {
        addNews({
          title: `🎯 ${playedLabel}: ${tgH.name} ${topGame.sh}-${topGame.sa} ${tgA.name}`,
          desc: `El partido de la jornada en la ${compName}. ${(topGame.sh + topGame.sa) >= 5 ? '¡Festival de goles y los dados ardiendo!' : 'Partido cerrado, resuelto por detalles mínimos.'} ${topGame.penH !== null && topGame.penH !== undefined ? `Se decidió en los penaltis (${topGame.penH}-${topGame.penA}): drama puro desde los once metros.` : ''}`,
          team: topGame.sh >= topGame.sa ? tgH : tgA, type: 'cupRound'
        });
      }

      // Tanda de penaltis / agonía
      const penGame = rows.find((r: any) => r.penH !== null && r.penH !== undefined && r.id !== topGame.id);
      if (penGame) {
        const pH = teamById(penGame.hId); const pA = teamById(penGame.aId);
        const penWinner = penGame.penH > penGame.penA ? pH : pA;
        const penLoser = penGame.penH > penGame.penA ? pA : pH;
        if (penWinner && penLoser && !usedIds.has(penWinner.id)) {
          addNews({
            title: `🥶 ${penWinner.name} sobrevive en los penaltis (${penGame.penH}-${penGame.penA})`,
            desc: `${playedLabel} de la ${compName}: ${penGame.sh}-${penGame.sa} en los 90 y todo a la lotería de los once metros. ${penLoser.name} se va a casa con la sensación de que estuvo ahí, rozándolo. Así es la copa: cruel y adictiva.`,
            team: penWinner, type: 'cupRound'
          });
        }
      }

      // Goleada / paliza de la ronda
      const thrash = [...rows].sort((a: any, b: any) => Math.abs(b.sh - b.sa) - Math.abs(a.sh - a.sa))[0];
      if (thrash && Math.abs(thrash.sh - thrash.sa) >= 3) {
        const wTeam = teamById(thrash.sh > thrash.sa ? thrash.hId : thrash.aId);
        const lTeam = teamById(thrash.sh > thrash.sa ? thrash.aId : thrash.hId);
        if (wTeam && lTeam && !usedIds.has(wTeam.id)) {
          addNews({
            title: `💣 Paliza en la ${compName}: ${wTeam.name} arrasa ${Math.max(thrash.sh, thrash.sa)}-${Math.min(thrash.sh, thrash.sa)} al ${lTeam.name}`,
            desc: `${playedLabel}. Exhibición total. ${lTeam.name} no encontró la manera de frenar la avalancha y ahora toca reconstruir la moral. ${wTeam.name} manda un mensaje al resto del torneo.`,
            team: wTeam, type: 'cupRound'
          });
        }
      }
    }

    // --- QUÉ SE JUEGA AHORA MISMO ---
    const rTeam = pick(sorted.filter(t => !usedIds.has(t.id))) || pick(sorted);
    if (cupPhase === 'Final') {
      addNews({ ...pick([
        { title: `🏆 ¡AHORA SÍ: LA GRAN FINAL DE LA ${compName.toUpperCase()}!`, desc: `Solo quedan dos. Un partido, noventa minutos y una vida entera de recuerdos en juego. Quien gane escribe su nombre en letras de oro; quien pierda cargará con el "casi" toda la temporada.` },
        { title: `👑 FINAL de la ${compName}: el partido que lo decide todo`, desc: `Todo el torneo cobra sentido aquí. Sin mañana, sin excusas, sin red de seguridad. La presión es MÁXIMA y los dados no tienen piedad.` },
      ]), team: rTeam, type: 'cupNext' });
    } else if (cupPhase === 'Semis') {
      addNews({ ...pick([
        { title: `⚡ SEMIFINALES en marcha: la ${compName} arde`, desc: `Cuatro equipos, dos billetes para la final. Aquí se forjan leyendas o se rompen sueños. El que tiemble, se queda fuera.` },
        { title: `🔥 La ${compName} entra en semis`, desc: `A un paso de la final. Cada error puede ser letal y cada acierto, eterno. Ya no hay margen para fallar.` },
      ]), team: rTeam, type: 'cupNext' });
    } else if (cupPhase === 'Cuartos') {
      addNews({ ...pick([
        { title: `🏟️ CUARTOS DE FINAL: la ${compName} se estrecha`, desc: `Ocho pretendientes, cuatro supervivientes. Los cuartos separan a los buenos de los grandes. ¿Mandarán los favoritos o habrá campanada?` },
        { title: `⚔️ Arranca lo bueno: cuartos de la ${compName}`, desc: `Desde aquí, cada partido es una final. Ganar o volver a casa. La copa no perdona.` },
      ]), team: rTeam, type: 'cupNext' });
    } else if (cupPhase === 'Octavos') {
      addNews({ ...pick([
        { title: `🎯 OCTAVOS DE FINAL de la ${compName}`, desc: `Terminaron los grupos y empieza la eliminación directa. Dieciséis equipos, ocho sobrevivirán. Aquí ya no hay segundas oportunidades.` },
        { title: `🚪 Se abren los octavos en la ${compName}`, desc: `El sorteo dejó cruces de infarto. Los grandes ya no pueden esconderse: un mal día y adiós al sueño.` },
      ]), team: rTeam, type: 'cupNext' });
    } else {
      addNews({ ...pick([
        { title: `🌍 ${compName}: la fase de grupos sigue su curso`, desc: `${playedLabel} disputada y la clasificación se mueve. Cada punto acerca o aleja de los octavos; nadie puede relajarse.` },
        { title: `📋 Grupos de la ${compName}: cuentas abiertas`, desc: `Tras ${playedLabel}, hay equipos que ya respiran y otros que empiezan a hacer cálculos desesperados.` },
      ]), team: rTeam, type: 'cupNext' });
    }

    // --- GRANDE EN PELIGRO (según la forma reciente real) ---
    const bigTeamsInCup = sorted.filter(t => t && !usedIds.has(t.id) && ((t.att || 0) >= 4 || (t.opp || 0) >= 4));
    const struggling = bigTeamsInCup.filter(t => {
      const st = getStreak(t.id);
      return st.type === 'L' || (st.type === 'D' && st.count >= 2);
    });
    if (struggling.length > 0) {
      const team = pick(struggling);
      const st = getStreak(team.id);
      addNews({
        title: `⚠️ ¿Campanada a la vista? ${team.name} tambalea en la ${compName}`,
        desc: `Viene de ${st.count} ${st.type === 'L' ? 'derrota(s)' : 'empate(s)'} y ahora le toca ${nextLabel.toLowerCase()}. En liga se remonta; en copa, cada cruce es una sentencia. Reacción o eliminación.`,
        team, type: 'crisis'
      });
    }
  }

  // === EQUIPO SORPRESA ===
  if (matchday > 3 && sorted.length > 6) {
    const midTable = sorted.slice(Math.floor(totalTeams * 0.3), Math.floor(totalTeams * 0.6)).filter(t => !usedIds.has(t.id) && (t.w || 0) >= 2);
    if (midTable.length > 0) {
      const surprise = pick(midTable);
      const sStreak = getStreak(surprise.id);
      const formStr = sStreak.results.slice(0, 4).split('').map(r => r === 'W' ? '✅' : r === 'D' ? '🟡' : '🔴').join('');
      addNews({ ...pick([
        { title: `👀 ${surprise.name}: la revelación`, desc: `${surprise.w || 0} victorias en ${matchday} jornadas. Forma: ${formStr || '—'}. ${phase === 'late' ? 'Ya no son sorpresa: son realidad.' : 'Trabajan en silencio pero hacen ruido.'}` },
        { title: `🐴 Ojo con ${surprise.name}`, desc: `${surprise.pts} pts. Forma reciente: ${formStr || '—'}. ${phase === 'final' ? 'A estas alturas, su presencia no es casualidad.' : 'Un proyecto que empieza a dar frutos.'}` },
      ]), team: surprise, type: 'surprise' });
    }
  }

  // === INVICTO ===
  if (matchday > 3) {
    const unbeaten = sorted.filter(t => (t.l || 0) === 0 && (t.p || 0) > 2 && !usedIds.has(t.id));
    if (unbeaten.length > 0) {
      const ub = pick(unbeaten);
      addNews({ ...pick([
        { title: `🛡️ ${ub.name} sigue invicto tras ${matchday} jornadas`, desc: `${ub.w || 0}V ${ub.d || 0}E sin derrotas. ${phase === 'final' ? '¿Terminarán invictos? Sería histórico.' : 'Racha que impone respeto.'}` },
        { title: `✨ ${matchday} fechas y ${ub.name} no cae`, desc: `${ub.pts} pts sin conocer la derrota. Los dados no los han traicionado ni una sola vez.` },
      ]), team: ub, type: 'leader' });
    }
  }

  // === PEOR DEFENSA ===
  if (matchday > 2) {
    const worstDef = [...teams].filter(t => !usedIds.has(t.id)).sort((a, b) => (b.ga || 0) - (a.ga || 0))[0];
    if (worstDef && (worstDef.ga || 0) > 5) {
      const gapm = ((worstDef.ga || 0) / matchday).toFixed(1);
      addNews({ ...pick([
        { title: `🚪 ${worstDef.name} sufre atrás: ${worstDef.ga} goles en contra`, desc: `${gapm} goles/partido. ${phase === 'late' ? 'En la recta final, esos goles cuestan caro.' : 'El arco sigue abierto.'}` },
        { title: `📉 Crisis defensiva en ${worstDef.name}`, desc: `${worstDef.ga} goles encajados. ${worstDef.def <= 2 ? 'Con DEF de ' + worstDef.def + ', el dado les condena atrás.' : 'El cuerpo técnico busca soluciones.'}` },
      ]), team: worstDef, type: 'crisis' });
    }
  }

  // === DATO RANDOM DE DADOS ===
  if (matchday >= 3 && Math.random() > 0.5) {
    const totalGoals = teams.reduce((sum, t) => sum + (t.gf || 0), 0);
    const avgGoals = (totalGoals / (matchday * (totalTeams / 2))).toFixed(1);
    const highScoringGames = history?.reduce((count, day) => {
      return count + (day.results?.filter((r: any) => ((r.sh || 0) + (r.sa || 0)) >= 5).length || 0);
    }, 0) || 0;
    addNews({ ...pick([
      { title: `🎲 Estadísticas del dado: ${avgGoals} goles/partido`, desc: `${totalGoals} goles en ${matchday} jornadas. ${parseFloat(avgGoals) > 2.5 ? 'Los dados han sido generosos esta temporada. Espectáculo asegurado.' : parseFloat(avgGoals) < 1.5 ? 'Temporada de dados conservadores. Pocos goles pero mucha intensidad.' : 'Promedio equilibrado. El dado reparte con justicia.'}` },
      { title: `📊 El dado ha hablado: ${highScoringGames} goleadas en ${matchday} jornadas`, desc: `${highScoringGames > 3 ? 'Partidos de 5+ goles que no se olvidan fácil.' : 'Pocos escándalos en el marcador.'} El promedio general es de ${avgGoals} goles por partido.` },
    ]), type: 'luck' });
  }

  // Derbys siempre van primero, luego el resto aleatorio
  // === ORDEN CRONOLÓGICO / RELEVANCIA ===
  // Primero lo que acaba de pasar en la jornada, después el contexto de la temporada.
  const PRIORITY: Record<string, number> = {
    leadChange: 0, leaderFall: 1, bigLoss: 2, cupRound: 3, derby: 4, cupNext: 5,
    momentum: 6, rivalry: 7, leader: 8, crisis: 9, relegation: 10, promotion: 11,
    surprise: 12, scorer: 13, stats: 14, defense: 15, luck: 16, generic: 17
  };
  const ordered = news
    .map((n, i) => ({ n, i, p: PRIORITY[n.type] ?? 18 }))
    .sort((a, b) => a.p - b.p || a.i - b.i)
    .map(x => x.n);
  return ordered.slice(0, 9);
};



export const WC_POPULAR_SUGGESTIONS = [
  { name: 'Japón', region: 'AS', flag: '🇯🇵' },
  { name: 'Colombia', region: 'SA', flag: '🇨🇴' },
  { name: 'México', region: 'NA', flag: '🇲🇽' },
  { name: 'Noruega', region: 'EU', flag: '🇳🇴' },
  { name: 'Nigeria', region: 'AF', flag: '🇳🇬' },
  { name: 'Australia', region: 'AS', flag: '🇦🇺' },
  { name: 'Egipto', region: 'AF', flag: '🇪🇬' },
  { name: 'Chile', region: 'SA', flag: '🇨🇱' },
  { name: 'Perú', region: 'SA', flag: '🇵🇪' },
  { name: 'Uruguay', region: 'SA', flag: '🇺🇾' },
  { name: 'USA', region: 'NA', flag: '🇺🇸' },
  { name: 'Costa Rica', region: 'NA', flag: '🇨🇷' },
  { name: 'Arabia Saudita', region: 'AS', flag: '🇸🇦' },
  { name: 'Senegal', region: 'AF', flag: '🇸🇳' },
  { name: 'Corea del Sur', region: 'AS', flag: '🇰🇷' },
  { name: 'Marruecos', region: 'AF', flag: '🇲🇦' },
  { name: 'Argelia', region: 'AF', flag: '🇩🇿' },
  { name: 'Ecuador', region: 'SA', flag: '🇪🇨' },
  { name: 'Canadá', region: 'NA', flag: '🇨🇦' },
  { name: 'Panamá', region: 'NA', flag: '🇵🇦' },
  { name: 'Paraguay', region: 'SA', flag: '🇵🇾' },
  { name: 'Venezuela', region: 'SA', flag: '🇻🇪' },
  { name: 'Ghana', region: 'AF', flag: '🇬🇭' },
  { name: 'Camerún', region: 'AF', flag: '🇨🇲' },
  { name: 'Costa de Marfil', region: 'AF', flag: '🇨🇮' },
  { name: 'Turquía', region: 'EU', flag: '🇹🇷' },
  { name: 'Serbia', region: 'EU', flag: '🇷🇸' },
  { name: 'Suecia', region: 'EU', flag: '🇸🇪' },
  { name: 'Polonia', region: 'EU', flag: '🇵🇱' },
  { name: 'Dinamarca', region: 'EU', flag: '🇩🇰' },
  { name: 'Austria', region: 'EU', flag: '🇦🇹' },
  { name: 'Nueva Zelanda', region: 'OC', flag: '🇳🇿' },
];

