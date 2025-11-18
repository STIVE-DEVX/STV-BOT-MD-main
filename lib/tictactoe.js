class TicTacToe {
    constructor(playerX = 'X', playerO = 'O') {
        this.playerX = playerX;
        this.playerO = playerO;

        this._currentTurn = false; // false = X, true = O
        this._x = 0;
        this._o = 0;
        this.turns = 0;
    }

    get board() {
        return this._x | this._o;
    }

    get currentTurn() {
        return this._currentTurn ? this.playerO : this.playerX;
    }

    get winner() {
        // Combinaisons gagnantes possibles
        const winningPatterns = [
            0b111000000, // Ligne du haut
            0b000111000, // Ligne du milieu
            0b000000111, // Ligne du bas
            0b100100100, // Colonne gauche
            0b010010010, // Colonne centre
            0b001001001, // Colonne droite
            0b100010001, // Diagonale ↘
            0b001010100  // Diagonale ↙
        ];

        // Vérifier X
        for (let pattern of winningPatterns) {
            if ((this._x & pattern) === pattern) {
                return this.playerX;
            }
        }

        // Vérifier O
        for (let pattern of winningPatterns) {
            if ((this._o & pattern) === pattern) {
                return this.playerO;
            }
        }

        return null; // Aucun gagnant
    }

    turn(player, pos) {
        // Vérification basique
        if (this.winner) return -1;        // Partie terminée
        if (pos < 0 || pos > 8) return -1; // Position invalide

        const bit = 1 << pos;

        // Case déjà prise
        if ((this._x | this._o) & bit) return 0;

        // Jouer
        if (this._currentTurn) {
            this._o |= bit;
        } else {
            this._x |= bit;
        }

        this._currentTurn = !this._currentTurn;
        this.turns++;

        return 1; // Coup valide
    }

    render() {
        return [...Array(9)].map((_, i) => {
            const bit = 1 << i;
            return this._x & bit ? 'X' :
                   this._o & bit ? 'O' :
                   i + 1;
        });
    }
}

module.exports = TicTacToe;; 