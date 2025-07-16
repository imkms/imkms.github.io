document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dealerHandEl = document.getElementById('dealer-hand');
    const playerHandEl = document.getElementById('player-hand');
    const dealerScoreEl = document.getElementById('dealer-score');
    const playerScoreEl = document.getElementById('player-score');
    const messageEl = document.getElementById('game-messages');
    const betControlsEl = document.getElementById('bet-controls');
    const actionControlsEl = document.getElementById('action-controls');
    const hitBtn = document.getElementById('hit-btn');
    const standBtn = document.getElementById('stand-btn');
    const doubleBtn = document.getElementById('double-down-btn');
    const playerWalletEl = document.getElementById('player-wallet');
    const currentBetEl = document.getElementById('current-bet');

    // Central Game State Object
    let gameState = {
        deck: [],
        playerHand: [],
        dealerHand: [],
        playerScore: 0,
        dealerScore: 0,
        playerWallet: 1000,
        currentBet: 0,
        isPlayerTurn: false,
        isGameOver: true,
    };

    function createDeck() {
        const suits = ['♠', '♥', '♦', '♣'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        gameState.deck = suits.flatMap(suit => ranks.map(rank => ({ suit, rank })));
    }

    function shuffle(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }

    function calculateScore(hand) {
        let score = 0;
        let aceCount = 0;
        for (const card of hand) {
            if (card.rank === 'A') {
                aceCount++;
                score += 11;
            } else if (['K', 'Q', 'J'].includes(card.rank)) {
                score += 10;
            } else {
                score += parseInt(card.rank);
            }
        }
        while (score > 21 && aceCount > 0) {
            score -= 10;
            aceCount--;
        }
        return score;
    }

    function dealCard(hand, isFaceDown = false) {
        const card = gameState.deck.pop();
        card.isFaceDown = isFaceDown;
        hand.push(card);
    }
    
    function dealInitialHands() {
        dealCard(gameState.playerHand, false); // Player card 1: Face-up
        dealCard(gameState.dealerHand, false); // Dealer card 1: Face-up
        dealCard(gameState.playerHand, false); // Player card 2: Face-up
        dealCard(gameState.dealerHand, true);  // Dealer card 2: Face-down
        
        gameState.isPlayerTurn = true;
        gameState.isGameOver = false;
        checkBlackjack();
    }

    function updateUI() {
        // Render hands
        playerHandEl.innerHTML = gameState.playerHand.map(card => `<div class="card">${card.rank}${card.suit}</div>`).join('');
        dealerHandEl.innerHTML = gameState.dealerHand.map(card => 
            card.isFaceDown ? `<div class="card face-down"></div>` : `<div class="card">${card.rank}${card.suit}</div>`
        ).join('');

        // Calculate and render scores
        gameState.playerScore = calculateScore(gameState.playerHand);
        playerScoreEl.textContent = gameState.playerScore;
        // Hide dealer's true score while one card is face down
        const visibleDealerHand = gameState.dealerHand.filter(card => !card.isFaceDown);
        gameState.dealerScore = calculateScore(visibleDealerHand);
        dealerScoreEl.textContent = gameState.dealerScore;

        // Update wallet
        playerWalletEl.textContent = gameState.playerWallet;
        currentBetEl.textContent = gameState.currentBet;
        
        // Update button states
        if(gameState.isGameOver) {
            betControlsEl.classList.remove('hidden');
            actionControlsEl.classList.add('hidden');
        } else {
            betControlsEl.classList.add('hidden');
            actionControlsEl.classList.remove('hidden');
            hitBtn.disabled = !gameState.isPlayerTurn;
            standBtn.disabled = !gameState.isPlayerTurn;
            doubleBtn.disabled = !(gameState.isPlayerTurn && gameState.playerHand.length === 2);
        }
    }

    function placeBet(amount) {
        if (gameState.playerWallet < amount) {
            messageEl.textContent = '> INSUFFICIENT FUNDS';
            return;
        }
        gameState.currentBet = amount;
        gameState.playerWallet -= amount;
        
        createDeck();
        shuffle(gameState.deck);
        dealInitialHands();
        updateUI();
    }

    function checkBlackjack() {
        if (calculateScore(gameState.playerHand) === 21) {
            messageEl.textContent = '> PLAYER BLACKJACK!';
            gameState.playerWallet += gameState.currentBet * 2.5;
            endGame();
        }
    }

    function playerHit() {
        dealCard(gameState.playerHand, false);
        updateUI();
        if (gameState.playerScore > 21) {
            messageEl.textContent = '> PLAYER BUSTS!';
            endGame();
        }
    }

    function playerStand() {
        gameState.isPlayerTurn = false;
        dealerPlay();
    }
    
    function playerDoubleDown() {
        if (gameState.playerWallet < gameState.currentBet) {
            messageEl.textContent = '> CANNOT DOUBLE: INSUFFICIENT FUNDS';
            return;
        }
        gameState.playerWallet -= gameState.currentBet;
        gameState.currentBet *= 2;
        
        dealCard(gameState.playerHand, false);
        updateUI();
        
        if (gameState.playerScore > 21) {
            messageEl.textContent = '> PLAYER BUSTS ON DOUBLE DOWN!';
            endGame();
        } else {
            playerStand();
        }
    }

    function dealerPlay() {
        // Reveal face-down card
        gameState.dealerHand.forEach(card => card.isFaceDown = false);
        gameState.dealerScore = calculateScore(gameState.dealerHand);
        updateUI();

        const dealerInterval = setInterval(() => {
            if (gameState.dealerScore < 17) {
                dealCard(gameState.dealerHand, false);
                gameState.dealerScore = calculateScore(gameState.dealerHand);
                updateUI();
            } else {
                clearInterval(dealerInterval);
                determineWinner();
            }
        }, 1000);
    }
    
    function determineWinner() {
        const finalPlayerScore = calculateScore(gameState.playerHand);
        const finalDealerScore = calculateScore(gameState.dealerHand);
        
        if (finalDealerScore > 21 || finalPlayerScore > finalDealerScore) {
            messageEl.textContent = '> PLAYER WINS!';
            gameState.playerWallet += gameState.currentBet * 2;
        } else if (finalPlayerScore < finalDealerScore) {
            messageEl.textContent = '> DEALER WINS.';
        } else {
            messageEl.textContent = '> PUSH.';
            gameState.playerWallet += gameState.currentBet;
        }
        endGame();
    }

    function endGame() {
        gameState.isGameOver = true;
        gameState.isPlayerTurn = false;
        gameState.currentBet = 0;
        gameState.playerHand = [];
        gameState.dealerHand = [];
        setTimeout(() => {
            messageEl.textContent += ' PLACE YOUR NEXT BET.';
            updateUI();
        }, 2000);
    }
    
    // Initial Setup
    betControlsEl.addEventListener('click', (e) => {
        if(e.target.matches('button')) {
            const betAmount = parseInt(e.target.dataset.bet, 10);
            placeBet(betAmount);
        }
    });
    hitBtn.addEventListener('click', playerHit);
    standBtn.addEventListener('click', playerStand);
    doubleBtn.addEventListener('click', playerDoubleDown);
    
    updateUI(); // Initial render
});