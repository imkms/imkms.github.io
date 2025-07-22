document.addEventListener('DOMContentLoaded', () => {
    const dealerHandEl = document.getElementById('dealer-hand');
    const playerHandsContainer = document.getElementById('player-hands-container');
    const dealerScoreEl = document.getElementById('dealer-score');
    const messageEl = document.getElementById('game-messages');
    const bettingControlsEl = document.getElementById('betting-controls');
    const betAmountEl = document.getElementById('bet-amount');
    const placeBetBtn = document.getElementById('place-bet-btn');
    const actionControlsEl = document.getElementById('action-controls');
    const hitBtn = document.getElementById('hit-btn');
    const standBtn = document.getElementById('stand-btn');
    const doubleBtn = document.getElementById('double-down-btn');
    const splitBtn = document.getElementById('split-btn');
    const playerBalanceEl = document.getElementById('player-balance');
    const totalBetEl = document.getElementById('total-bet');

    let gameState = { deck: [], dealerHand: [], playerHands: [], activeHandIndex: 0, playerBalance: 100, isGameOver: true };

    function createDeckAndShuffle() {
        const s=['♠','♥','♦','♣'], r=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
        gameState.deck = s.flatMap(suit => r.map(rank => ({ suit, rank })));
        for (let i = gameState.deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [gameState.deck[i], gameState.deck[j]] = [gameState.deck[j], gameState.deck[i]];}
    }

    function getCardValue(rank) {
        if ('JQK'.includes(rank)) return 10;
        if (rank === 'A') return 11;
        return parseInt(rank);
    }

    function calculateScore(hand) {
        let score = hand.reduce((sum, card) => sum + getCardValue(card.rank), 0);
        let aceCount = hand.filter(card => card.rank === 'A').length;
        while (score > 21 && aceCount-- > 0) { score -= 10; }
        return score;
    }

    function renderHands() {
        // Render Dealer Hand
        dealerHandEl.innerHTML = '';
        gameState.dealerHand.forEach(card => dealerHandEl.appendChild(createCardElement(card)));
        const visibleDealerScore = gameState.isGameOver ? calculateScore(gameState.dealerHand) : calculateScore(gameState.dealerHand.filter(c => !c.isFaceDown));
        dealerScoreEl.textContent = visibleDealerScore;

        // Render Player Hands
        playerHandsContainer.innerHTML = '';
        gameState.playerHands.forEach((handData, index) => {
            const handWrapper = document.createElement('div');
            handWrapper.className = 'hand-wrapper';
            if (index === gameState.activeHandIndex && !gameState.isGameOver) {
                handWrapper.classList.add('active-hand');
            }
            const handEl = document.createElement('div');
            handEl.className = 'hand-container';
            handData.cards.forEach(card => handEl.appendChild(createCardElement(card)));
            
            const handInfo = document.createElement('p');
            handInfo.className = 'hand-info';
            handInfo.textContent = `Hand ${index + 1} (Bet: ${handData.bet}) - Score: ${calculateScore(handData.cards)}`;
            if (handData.status !== 'playing') {
                handInfo.textContent += ` - ${handData.status.toUpperCase()}`;
            }

            handWrapper.appendChild(handInfo);
            handWrapper.appendChild(handEl);
            playerHandsContainer.appendChild(handWrapper);
        });
    }
    
    function createCardElement(card) {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        if (!card.isFaceDown) cardEl.classList.add('is-flipped');
        if (card.isNewlyDealt) { cardEl.classList.add('newly-dealt'); card.isNewlyDealt = false; }
        cardEl.innerHTML = `<div class="card-face card-back"></div><div class="card-face card-front">${card.rank}${card.suit}</div>`;
        return cardEl;
    }

    function updateUI() {
        renderHands();
        playerBalanceEl.textContent = gameState.playerBalance;
        totalBetEl.textContent = gameState.playerHands.reduce((total, hand) => total + hand.bet, 0);

        if (gameState.isGameOver) {
            bettingControlsEl.classList.remove('hidden');
            actionControlsEl.classList.add('hidden');
        } else {
            bettingControlsEl.classList.add('hidden');
            actionControlsEl.classList.remove('hidden');
            
            const activeHand = gameState.playerHands[gameState.activeHandIndex];
            const canSplit = activeHand.cards.length === 2 && getCardValue(activeHand.cards[0].rank) === getCardValue(activeHand.cards[1].rank) && gameState.playerBalance >= activeHand.bet;
            const canDouble = activeHand.cards.length === 2 && gameState.playerBalance >= activeHand.bet;

            hitBtn.disabled = activeHand.status !== 'playing';
            standBtn.disabled = activeHand.status !== 'playing';
            splitBtn.disabled = !canSplit || gameState.playerHands.length > 1; // Can only split once
            doubleBtn.disabled = !canDouble;
        }
    }
    
    function showMessage(msg, append = false) {
        messageEl.textContent = append ? `${messageEl.textContent} | ${msg}` : `> ${msg}`;
        messageEl.classList.add('new-message');
        setTimeout(() => messageEl.classList.remove('new-message'), 800);
    }

    function placeBet() {
        const betValue = parseInt(betAmountEl.value);
        if (isNaN(betValue) || betValue <= 0 || betValue > gameState.playerBalance) { showMessage('INVALID BET'); return; }
        
        gameState.playerBalance -= betValue;
        gameState.isGameOver = false;
        gameState.dealerHand = [];
        gameState.playerHands = [{ cards: [], bet: betValue, status: 'playing' }];
        gameState.activeHandIndex = 0;
        
        createDeckAndShuffle();
        
        dealCard(gameState.playerHands[0]);
        dealCard({ cards: gameState.dealerHand }, false);
        dealCard(gameState.playerHands[0]);
        dealCard({ cards: gameState.dealerHand }, true);

        if (calculateScore(gameState.playerHands[0].cards) === 21) {
            playerStand();
        } else {
            showMessage("PLAYER'S TURN");
        }
        updateUI();
    }

    function dealCard(handData, isFaceDown = false) {
        const card = gameState.deck.pop();
        card.isNewlyDealt = true;
        card.isFaceDown = isFaceDown;
        handData.cards.push(card);
    }

    function playerHit() {
        const activeHand = gameState.playerHands[gameState.activeHandIndex];
        dealCard(activeHand);
        if (calculateScore(activeHand.cards) > 21) {
            activeHand.status = 'bust';
            showMessage(`HAND ${gameState.activeHandIndex + 1} BUSTS`, true);
            nextHandOrDealer();
        }
        updateUI();
    }

    function playerStand() {
        gameState.playerHands[gameState.activeHandIndex].status = 'stood';
        nextHandOrDealer();
    }
    
    function playerDoubleDown() {
        const activeHand = gameState.playerHands[gameState.activeHandIndex];
        gameState.playerBalance -= activeHand.bet;
        activeHand.bet *= 2;
        dealCard(activeHand);
        activeHand.status = calculateScore(activeHand.cards) > 21 ? 'bust' : 'stood';
        updateUI();
        setTimeout(nextHandOrDealer, 800);
    }

    function playerSplit() {
        const handToSplit = gameState.playerHands[0];
        gameState.playerBalance -= handToSplit.bet;
        const secondHand = { cards: [handToSplit.cards.pop()], bet: handToSplit.bet, status: 'playing' };
        gameState.playerHands.push(secondHand);
        dealCard(handToSplit);
        dealCard(secondHand);
        updateUI();
    }
    
    function nextHandOrDealer() {
        if (gameState.activeHandIndex < gameState.playerHands.length - 1) {
            gameState.activeHandIndex++;
            showMessage(`PLAYING HAND ${gameState.activeHandIndex + 1}`);
            updateUI();
        } else {
            dealerPlay();
        }
    }

    function dealerPlay() {
        gameState.isGameOver = true; // To show dealer score
        const faceDownCard = gameState.dealerHand.find(card => card.isFaceDown);
        if (faceDownCard) faceDownCard.isFaceDown = false;
        updateUI();

        const dealerInterval = setInterval(() => {
            if (calculateScore(gameState.dealerHand) < 17) {
                dealCard({ cards: gameState.dealerHand });
                updateUI();
            } else {
                clearInterval(dealerInterval);
                determineWinner();
            }
        }, 1000);
    }
    
    function determineWinner() {
        const dealerScore = calculateScore(gameState.dealerHand);
        let finalMessage = '';

        gameState.playerHands.forEach((hand, index) => {
            const playerScore = calculateScore(hand.cards);
            let resultMsg = `H${index + 1}: `;
            
            if (playerScore > 21) {
                resultMsg += 'BUST.';
            } else if (dealerScore > 21 || playerScore > dealerScore) {
                resultMsg += 'WIN!';
                gameState.playerBalance += hand.bet * 2;
            } else if (playerScore < dealerScore) {
                resultMsg += 'LOSE.';
            } else {
                resultMsg += 'PUSH.';
                gameState.playerBalance += hand.bet;
            }
            finalMessage += resultMsg + ' ';
        });
        
        showMessage(finalMessage);
        setTimeout(() => { showMessage('PLACE YOUR NEXT BET.'); gameState.isGameOver = true; updateUI(); }, 3000);
    }
    
    placeBetBtn.addEventListener('click', placeBet);
    hitBtn.addEventListener('click', playerHit);
    standBtn.addEventListener('click', playerStand);
    doubleBtn.addEventListener('click', playerDoubleDown);
    splitBtn.addEventListener('click', playerSplit);
    
    showMessage('PLACE YOUR BET TO START.');
    updateUI();
});