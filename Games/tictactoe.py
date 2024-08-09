import random

# Game settings
board = [" ", " ", " ", " ", " ", " ", " ", " ", " "]
player = "X"
computer = "O"
winning_positions = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]

def draw_board():
    # Draw the game board
    print("   |   |   ")
    print(" " + board[0] + " | " + board[1] + " | " + board[2] + " ")
    print("___|___|___")
    print("   |   |   ")
    print(" " + board[3] + " | " + board[4] + " | " + board[5] + " ")
    print("___|___|___")
    print("   |   |   ")
    print(" " + board[6] + " | " + board[7] + " | " + board[8] + " ")
    print("   |   |   ")

def get_player_move():
    # Get the player's move
    move = input("Enter your move (1-9): ")
    while move not in ["1", "2", "3", "4", "5", "6", "7", "8", "9"] or board[int(move)-1] != " ":
        move = input("Enter a valid move (1-9): ")
    return int(move) - 1

def get_computer_move():
    # Get the computer's move
    for i in range(9):
        if board[i] == " ":
            board[i] = computer
            if check_win(computer):
                return i
            board[i] = " "
    for i in range(9):
        if board[i] == " ":
            board[i] = player
            if check_win(player):
                board[i] = computer
                return i
            board[i] = " "
    if board[4] == " ":
        return 4
    while True:
        move = random.randint(0, 8)
        if board[move] == " ":
            return move

def check_win(symbol):
    # Check for a winner
    for position in winning_positions:
        if board[position[0]] == symbol and board[position[1]] == symbol and board[position[2]] == symbol:
            return True
    return False

def check_tie():
    # Check if it's a tie
    for i in range(9):
        if board[i] == " ":
            return False
    return True

def play_game():
    # Game loop
    global board
    board = [" ", " ", " ", " ", " ", " ", " ", " ", " "]
    while True:
        draw_board()
        if check_win(player):
            print("Player wins!")
            break
        elif check_win(computer):
            print("Computer wins!")
            break
        elif check_tie():
            print("It's a tie!")
            break
        if player == "X":
            move = get_player_move()
            board[move] = player
            player = "O"
            computer = "X"
        else:
            move = get_computer_move()
            board[move] = computer
            player = "X"
            computer = "O"

# Start the game
play_game()
