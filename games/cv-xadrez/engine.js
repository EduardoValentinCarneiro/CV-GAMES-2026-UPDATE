(function () {
  'use strict';

  const FILES = 'abcdefgh';
  const PROMOTIONS = ['Q', 'R', 'B', 'N'];
  const KNIGHT_STEPS = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  const KING_STEPS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  const ROOK_DIRS = [[-1,0],[0,-1],[0,1],[1,0]];
  const BISHOP_DIRS = [[-1,-1],[-1,1],[1,-1],[1,1]];
  const PIECE_SAN = { K:'K', Q:'Q', R:'R', B:'B', N:'N', P:'' };

  const opposite = (color) => color === 'w' ? 'b' : 'w';
  const rowOf = (square) => Math.floor(square / 8);
  const colOf = (square) => square % 8;
  const inBounds = (row, col) => row >= 0 && row < 8 && col >= 0 && col < 8;
  const squareAt = (row, col) => row * 8 + col;
  const squareName = (square) => `${FILES[colOf(square)]}${8 - rowOf(square)}`;
  const typeOf = (piece) => piece ? piece[1] : null;
  const colorOf = (piece) => piece ? piece[0] : null;
  const clonePosition = (position) => ({
    board: [...position.board], turn: position.turn, castling: { ...position.castling },
    enPassant: position.enPassant, halfmove: position.halfmove, fullmove: position.fullmove
  });

  function createInitialPosition() {
    const board = Array(64).fill(null);
    const backRank = ['R','N','B','Q','K','B','N','R'];
    for (let col = 0; col < 8; col += 1) {
      board[col] = `b${backRank[col]}`;
      board[8 + col] = 'bP';
      board[48 + col] = 'wP';
      board[56 + col] = `w${backRank[col]}`;
    }
    return { board, turn: 'w', castling: { wK:true, wQ:true, bK:true, bQ:true }, enPassant:null, halfmove:0, fullmove:1 };
  }

  function findKing(board, color) {
    return board.findIndex((piece) => piece === `${color}K`);
  }

  function isSquareAttacked(board, target, byColor) {
    const row = rowOf(target);
    const col = colOf(target);
    const pawnSourceRow = row + (byColor === 'w' ? 1 : -1);
    for (const pawnCol of [col - 1, col + 1]) {
      if (inBounds(pawnSourceRow, pawnCol) && board[squareAt(pawnSourceRow, pawnCol)] === `${byColor}P`) return true;
    }
    for (const [dr, dc] of KNIGHT_STEPS) {
      const sourceRow = row + dr;
      const sourceCol = col + dc;
      if (inBounds(sourceRow, sourceCol) && board[squareAt(sourceRow, sourceCol)] === `${byColor}N`) return true;
    }
    for (const [dr, dc] of KING_STEPS) {
      const sourceRow = row + dr;
      const sourceCol = col + dc;
      if (inBounds(sourceRow, sourceCol) && board[squareAt(sourceRow, sourceCol)] === `${byColor}K`) return true;
    }
    const rays = [
      ...ROOK_DIRS.map(([dr, dc]) => ({ dr, dc, types:['R','Q'] })),
      ...BISHOP_DIRS.map(([dr, dc]) => ({ dr, dc, types:['B','Q'] }))
    ];
    for (const { dr, dc, types } of rays) {
      let scanRow = row + dr;
      let scanCol = col + dc;
      while (inBounds(scanRow, scanCol)) {
        const piece = board[squareAt(scanRow, scanCol)];
        if (piece) {
          if (colorOf(piece) === byColor && types.includes(typeOf(piece))) return true;
          break;
        }
        scanRow += dr;
        scanCol += dc;
      }
    }
    return false;
  }

  function isInCheck(position, color = position.turn) {
    const king = findKing(position.board, color);
    return king < 0 || isSquareAttacked(position.board, king, opposite(color));
  }

  function appendMove(moves, position, from, to, extras = {}) {
    const moving = position.board[from];
    const target = position.board[to];
    moves.push({ from, to, capture: Boolean(target) || Boolean(extras.enPassant), captured: target || (extras.enPassant ? `${opposite(colorOf(moving))}P` : null), ...extras });
  }

  function appendPawnMove(moves, position, from, to, extras = {}) {
    const destinationRow = rowOf(to);
    const promotionRow = colorOf(position.board[from]) === 'w' ? 0 : 7;
    if (destinationRow === promotionRow) {
      for (const promotion of PROMOTIONS) appendMove(moves, position, from, to, { ...extras, promotion });
    } else appendMove(moves, position, from, to, extras);
  }

  function generatePseudoLegalMoves(position, color = position.turn) {
    const board = position.board;
    const moves = [];
    for (let from = 0; from < 64; from += 1) {
      const piece = board[from];
      if (!piece || colorOf(piece) !== color) continue;
      const type = typeOf(piece);
      const row = rowOf(from);
      const col = colOf(from);
      if (type === 'P') {
        const direction = color === 'w' ? -1 : 1;
        const startRow = color === 'w' ? 6 : 1;
        const nextRow = row + direction;
        if (inBounds(nextRow, col) && !board[squareAt(nextRow, col)]) {
          appendPawnMove(moves, position, from, squareAt(nextRow, col));
          const doubleRow = row + direction * 2;
          if (row === startRow && !board[squareAt(doubleRow, col)]) appendMove(moves, position, from, squareAt(doubleRow, col), { doublePawn:true });
        }
        for (const captureCol of [col - 1, col + 1]) {
          if (!inBounds(nextRow, captureCol)) continue;
          const to = squareAt(nextRow, captureCol);
          const target = board[to];
          if ((target && colorOf(target) !== color && typeOf(target) !== 'K') || position.enPassant === to) {
            appendPawnMove(moves, position, from, to, { enPassant:!target && position.enPassant === to });
          }
        }
      } else if (type === 'N' || type === 'K') {
        const steps = type === 'N' ? KNIGHT_STEPS : KING_STEPS;
        for (const [dr, dc] of steps) {
          const nextRow = row + dr;
          const nextCol = col + dc;
          if (!inBounds(nextRow, nextCol)) continue;
          const to = squareAt(nextRow, nextCol);
          const target = board[to];
          if (!target || (colorOf(target) !== color && typeOf(target) !== 'K')) appendMove(moves, position, from, to);
        }
        if (type === 'K') appendCastlingMoves(moves, position, color, from);
      } else {
        const directions = type === 'R' ? ROOK_DIRS : type === 'B' ? BISHOP_DIRS : [...ROOK_DIRS, ...BISHOP_DIRS];
        for (const [dr, dc] of directions) {
          let nextRow = row + dr;
          let nextCol = col + dc;
          while (inBounds(nextRow, nextCol)) {
            const to = squareAt(nextRow, nextCol);
            const target = board[to];
            if (!target) appendMove(moves, position, from, to);
            else {
              if (colorOf(target) !== color && typeOf(target) !== 'K') appendMove(moves, position, from, to);
              break;
            }
            nextRow += dr;
            nextCol += dc;
          }
        }
      }
    }
    return moves;
  }

  function appendCastlingMoves(moves, position, color, from) {
    const row = color === 'w' ? 7 : 0;
    const kingHome = squareAt(row, 4);
    if (from !== kingHome || isSquareAttacked(position.board, kingHome, opposite(color))) return;
    const safeTransit = (transitSquare) => {
      const transitBoard = [...position.board];
      transitBoard[kingHome] = null;
      transitBoard[transitSquare] = `${color}K`;
      return !isSquareAttacked(transitBoard, transitSquare, opposite(color));
    };
    const kingSide = `${color}K`;
    const queenSide = `${color}Q`;
    if (position.castling[kingSide] && position.board[squareAt(row, 7)] === `${color}R`
      && !position.board[squareAt(row, 5)] && !position.board[squareAt(row, 6)]
      && safeTransit(squareAt(row, 5))) {
      moves.push({ from, to:squareAt(row, 6), castle:'K', capture:false, captured:null });
    }
    if (position.castling[queenSide] && position.board[squareAt(row, 0)] === `${color}R`
      && !position.board[squareAt(row, 1)] && !position.board[squareAt(row, 2)] && !position.board[squareAt(row, 3)]
      && safeTransit(squareAt(row, 3))) {
      moves.push({ from, to:squareAt(row, 2), castle:'Q', capture:false, captured:null });
    }
  }

  function applyMove(position, move) {
    const next = clonePosition(position);
    const board = next.board;
    const piece = board[move.from];
    const color = colorOf(piece);
    const type = typeOf(piece);
    let captured = board[move.to];
    if (move.enPassant) {
      const capturedSquare = move.to + (color === 'w' ? 8 : -8);
      captured = board[capturedSquare];
      board[capturedSquare] = null;
    }
    board[move.from] = null;
    board[move.to] = move.promotion ? `${color}${move.promotion}` : piece;
    if (move.castle) {
      const row = color === 'w' ? 7 : 0;
      const rookFrom = squareAt(row, move.castle === 'K' ? 7 : 0);
      const rookTo = squareAt(row, move.castle === 'K' ? 5 : 3);
      board[rookTo] = board[rookFrom];
      board[rookFrom] = null;
    }
    if (type === 'K') {
      next.castling[`${color}K`] = false;
      next.castling[`${color}Q`] = false;
    }
    if (type === 'R') clearRookRight(next.castling, color, move.from);
    if (captured && typeOf(captured) === 'R') clearRookRight(next.castling, colorOf(captured), move.to + (move.enPassant ? (color === 'w' ? 8 : -8) : 0));
    next.enPassant = move.doublePawn ? (move.from + move.to) / 2 : null;
    next.halfmove = type === 'P' || captured ? 0 : next.halfmove + 1;
    if (color === 'b') next.fullmove += 1;
    next.turn = opposite(color);
    return { position:next, captured };
  }

  function clearRookRight(castling, color, square) {
    const row = color === 'w' ? 7 : 0;
    if (square === squareAt(row, 0)) castling[`${color}Q`] = false;
    if (square === squareAt(row, 7)) castling[`${color}K`] = false;
  }

  function getLegalMoves(position, color = position.turn) {
    return generatePseudoLegalMoves(position, color).filter((move) => {
      const { position:next } = applyMove(position, move);
      return !isInCheck(next, color);
    });
  }

  function positionKey(position) {
    const pieces = position.board.map((piece) => piece || '--').join('');
    const rights = ['wK','wQ','bK','bQ'].filter((key) => position.castling[key]).join('') || '-';
    const usableEnPassant = position.enPassant !== null && getLegalMoves(position).some((move) => move.enPassant);
    return `${pieces}|${position.turn}|${rights}|${usableEnPassant ? position.enPassant : '-'}`;
  }

  function isInsufficientMaterial(position) {
    const pieces = position.board.map((piece, square) => piece ? { type:typeOf(piece), square } : null).filter((piece) => piece && piece.type !== 'K');
    if (pieces.some(({ type }) => ['P','R','Q'].includes(type))) return false;
    if (pieces.length <= 1) return true;
    if (pieces.every(({ type }) => type === 'B')) {
      const bishopSquareColors = new Set(pieces.map(({ square }) => (rowOf(square) + colOf(square)) % 2));
      return bishopSquareColors.size === 1;
    }
    return false;
  }

  function getOutcome(position, repetitionCount = 1) {
    const check = isInCheck(position);
    const legalMoves = getLegalMoves(position);
    if (legalMoves.length === 0) {
      if (check) return { type:'checkmate', winner:opposite(position.turn), check:true };
      return { type:'stalemate', check:false };
    }
    if (repetitionCount >= 5) return { type:'fivefold', check, draw:true };
    if (position.halfmove >= 150) return { type:'seventy-five-move', check, draw:true };
    if (isInsufficientMaterial(position)) return { type:'insufficient', check, draw:true };
    return { type:'check', check, claimable:repetitionCount >= 3 || position.halfmove >= 100, legalMoves };
  }

  function moveToSan(position, move, legalMoves = getLegalMoves(position)) {
    if (move.castle === 'K') return sanWithCheck(position, move, 'O-O');
    if (move.castle === 'Q') return sanWithCheck(position, move, 'O-O-O');
    const piece = position.board[move.from];
    const type = typeOf(piece);
    const capture = Boolean(position.board[move.to]) || Boolean(move.enPassant);
    let san = PIECE_SAN[type];
    if (type === 'P' && capture) san += FILES[colOf(move.from)];
    if (type !== 'P') {
      const contenders = legalMoves.filter((other) => other.from !== move.from && other.to === move.to && typeOf(position.board[other.from]) === type);
      if (contenders.length) {
        const sameFile = contenders.some((other) => colOf(other.from) === colOf(move.from));
        const sameRank = contenders.some((other) => rowOf(other.from) === rowOf(move.from));
        if (!sameFile) san += FILES[colOf(move.from)];
        else if (!sameRank) san += String(8 - rowOf(move.from));
        else san += squareName(move.from);
      }
    }
    if (capture) san += 'x';
    san += squareName(move.to);
    if (move.promotion) san += `=${PIECE_SAN[move.promotion]}`;
    return sanWithCheck(position, move, san);
  }

  function sanWithCheck(position, move, san) {
    const { position:next } = applyMove(position, move);
    if (!isInCheck(next)) return san;
    return `${san}${getLegalMoves(next).length === 0 ? '#' : '+'}`;
  }

  window.CV_CHESS_ENGINE = Object.freeze({
    createInitialPosition, clonePosition, squareName, rowOf, colOf, typeOf, colorOf,
    getLegalMoves, applyMove, isInCheck, isSquareAttacked, positionKey, isInsufficientMaterial,
    getOutcome, moveToSan
  });
})();
