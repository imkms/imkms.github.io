document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dealerHandEl = document.getElementById('dealer-hand');
    const playerHandEl = document.getElementById('player-hand');
    const dealerScoreEl = document.getElementById('dealer-score');
    const playerScoreEl = document.getElementById('player-score');
    const messageEl = document.getElementById('game-messages');
    const bettingControlsEl = document.getElementById('betting-controls');
    const betAmountEl = document.getElementById('bet-amount');
    const placeBetBtn = document.getElementById('place-bet-btn');
    const actionControlsEl = document.getElementById('action-controls');
    const hitBtn = document.getElementById('hit-btn');
    const standBtn = document.getElementById('stand-btn');
    const doubleBtn = document.getElementById('double-down-btn');
    const playerBalanceEl = document.getElementById('player-balance');
    const currentBetEl = document.getElementById('current-bet');

    // Central Game State
    let gameState = { deck: [], playerHand: [], dealerHand: [], playerScore: 0, dealerScore: 0, playerBalance: 100, currentBet: 0, isPlayerTurn: false, isGameOver: true };

    // --- Core Game Logic ---
    function createDeckAndShuffle() {
        const s=['♠','♥','♦','♣'], r=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
        gameState.deck = s.flatMap(suit => r.map(rank => ({ suit, rank })));
        for (let i = gameState.deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [gameState.deck[i], gameState.deck[j]] = [gameState.deck[j], gameState.deck[i]];}
    }
    function calculateScore(hand) {
        let score=0, aceCount=0;
        hand.forEach(card => { if(card.rank==='A'){aceCount++; score+=11;} else if('JQK'.includes(card.rank)){score+=10;} else{score+=parseInt(card.rank);} });
        while(score>21 && aceCount-->0) score-=10;
        return score;
    }
    
    // --- UI & Rendering ---
    function renderHand(hand, element) {
        element.innerHTML = ''; // Clear previous hand
        hand.forEach((card, index) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card';
            
            const cardFront = document.createElement('div');
            cardFront.className = 'card-face card-front';
            cardFront.textContent = `${card.rank}${card.suit}`;
            
            const cardBack = document.createElement('div');
            cardBack.className = 'card-face card-back';
            
            cardEl.append(cardBack, cardFront);

            // Trigger animations
            if(card.isNewlyDealt) {
                cardEl.classList.add('newly-dealt');
                card.isNewlyDealt = false; // Prevent re-animation on simple UI refresh
            }
            if(!card.isFaceDown) {
                cardEl.classList.add('is-flipped');
            }
            element.appendChild(cardEl);
        });
    }

    function updateUI() {
        renderHand(gameState.playerHand, playerHandEl);
        renderHand(gameState.dealerHand, dealerHandEl);
        
        gameState.playerScore = calculateScore(gameState.playerHand);
        playerScoreEl.textContent = gameState.playerScore;
        const visibleDealerHand = gameState.dealerHand.filter(card => !card.isFaceDown);
        dealerScoreEl.textContent = calculateScore(visibleDealerHand);
        
        playerBalanceEl.textContent = gameState.playerBalance;
        currentBetEl.textContent = gameState.currentBet;
        
        if(gameState.isGameOver) {
            bettingControlsEl.classList.remove('hidden'); actionControlsEl.classList.add('hidden');
        } else {
            bettingControlsEl.classList.add('hidden'); actionControlsEl.classList.remove('hidden');
            hitBtn.disabled = !gameState.isPlayerTurn; standBtn.disabled = !gameState.isPlayerTurn;
            doubleBtn.disabled = !(gameState.isPlayerTurn && gameState.playerHand.length === 2 && gameState.playerBalance >= gameState.currentBet);
        }
    }
    
    function showMessage(msg) {
        messageEl.textContent = `> ${msg}`;
        messageEl.classList.add('new-message');
        setTimeout(() => messageEl.classList.remove('new-message'), 800);
    }
    
    // --- Game Flow ---
    function placeBet() {
        const betValue = parseInt(betAmountEl.value);
        if (isNaN(betValue) || betValue <= 0 || betValue > gameState.playerBalance) { showMessage('INVALID BET AMOUNT'); return; }
        
        gameState.currentBet = betValue;
        gameState.playerBalance -= betValue;
        gameState.isGameOver = false;
        gameState.playerHand = []; gameState.dealerHand = [];
        
        createDeckAndShuffle();
        
        // Deal cards and mark them for animation
        const pCard1 = gameState.deck.pop(); pCard1.isNewlyDealt = true;
        const dCard1 = gameState.deck.pop(); dCard1.isNewlyDealt = true;
        const pCard2 = gameState.deck.pop(); pCard2.isNewlyDealt = true;
        const dCard2 = gameState.deck.pop(); dCard2.isNewlyDealt = true; dCard2.isFaceDown = true;
        
        gameState.playerHand.push(pCard1, pCard2);
        gameState.dealerHand.push(dCard1, dCard2);
        
        gameState.isPlayerTurn = true;
        showMessage("PLAYER'S TURN");
        updateUI();

        if (calculateScore(gameState.playerHand) === 21) { playerStand(); }
    }

    function playerHit() {
        const newCard = gameState.deck.pop();
        newCard.isNewlyDealt = true;
        gameState.playerHand.push(newCard);
        updateUI();
        if (calculateScore(gameState.playerHand) > 21) { showMessage('PLAYER BUSTS!'); endGame(false); }
    }

    function playerStand() {
        gameState.isPlayerTurn = false;
        updateUI(); // Disable buttons immediately
        dealerPlay();
    }
    
    function playerDoubleDown() {
        if(gameState.playerBalance < gameState.currentBet) { showMessage('INSUFFICIENT BALANCE TO DOUBLE'); return; }
        gameState.playerBalance -= gameState.currentBet;
        gameState.currentBet *= 2;
        const newCard = gameState.deck.pop();
        newCard.isNewlyDealt = true;
        gameState.playerHand.push(newCard);
        updateUI();
        if (calculateScore(gameState.playerHand) > 21) { showMessage('PLAYER BUSTS!'); endGame(false); } 
        else { playerStand(); }
    }

    function dealerPlay() {
        const faceDownCard = gameState.dealerHand.find(card => card.isFaceDown);
        if(faceDownCard) faceDownCard.isFaceDown = false;
        updateUI();

        const dealerInterval = setInterval(() => {
            gameState.dealerScore = calculateScore(gameState.dealerHand);
            if (gameState.dealerScore < 17) {
                const newCard = gameState.deck.pop();
                newCard.isNewlyDealt = true;
                gameState.dealerHand.push(newCard);
                updateUI();
            } else {
                clearInterval(dealerInterval);
                determineWinner();
            }
        }, 1000);
    }
    
    function determineWinner() {
        const pScore = calculateScore(gameState.playerHand);
        const dScore = calculateScore(gameState.dealerHand);
        if (pScore > 21) { showMessage('PLAYER BUSTS.'); endGame(false); }
        else if (pScore === 21 && gameState.playerHand.length === 2) { showMessage('PLAYER BLACKJACK!'); endGame(true, 2.5); }
        else if (dScore > 21 || pScore > dScore) { showMessage('PLAYER WINS!'); endGame(true, 2); } 
        else if (pScore < dScore) { showMessage('DEALER WINS.'); endGame(false); } 
        else { showMessage('PUSH.'); endGame(true, 1); }
    }

    function endGame(playerWon, payoutMultiplier = 0) {
        if (playerWon) gameState.playerBalance += gameState.currentBet * payoutMultiplier;
        gameState.isGameOver = true;
        gameState.isPlayerTurn = false;
        gameState.currentBet = 0;
        setTimeout(() => { showMessage('PLACE YOUR NEXT BET.'); updateUI(); }, 2000);
    }
    
    placeBetBtn.addEventListener('click', placeBet);
    hitBtn.addEventListener('click', playerHit);
    standBtn.addEventListener('click', playerStand);
    doubleBtn.addEventListener('click', playerDoubleDown);
    
    showMessage('PLACE YOUR BET TO START.');
    updateUI(); // Initial render
});