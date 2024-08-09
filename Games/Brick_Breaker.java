import javax.swing.*;
import java.awt.*;
import java.awt.event.*;

public class BrickBreaker extends JFrame implements ActionListener, KeyListener {
    private Timer timer;
    private boolean play = false;
    private int score = 0;

    private int paddleX = 310;
    private int ballPosX = 120;
    private int ballPosY = 350;
    private int ballXDir = -1;
    private int ballYDir = -2;

    private int[][] bricks;
    private int brickRowCount = 3;
    private int brickColumnCount = 7;
    private int totalBricks = brickRowCount * brickColumnCount;

    public BrickBreaker() {
        setTitle("Brick Breaker");
        setDefaultCloseOperation(EXIT_ON_CLOSE);
        setSize(700, 600);
        setResizable(false);
        setLocationRelativeTo(null);
        addKeyListener(this);

        bricks = new int[brickRowCount][brickColumnCount];

        timer = new Timer(5, this);
        timer.start();

        setVisible(true);
    }

    public void paint(Graphics g) {
        // Background
        g.setColor(Color.black);
        g.fillRect(1, 1, 692, 592);

        // Bricks
        for (int i = 0; i < brickRowCount; i++) {
            for (int j = 0; j < brickColumnCount; j++) {
                if (bricks[i][j] == 1) {
                    g.setColor(Color.white);
                    g.fillRect(j * 100 + 30, i * 40 + 50, 90, 30);
                }
            }
        }

        // Paddle
        g.setColor(Color.green);
        g.fillRect(paddleX, 550, 100, 8);

        // Ball
        g.setColor(Color.yellow);
        g.fillOval(ballPosX, ballPosY, 20, 20);

        // Score
        g.setColor(Color.white);
        g.setFont(new Font("Arial", Font.BOLD, 25));
        g.drawString("Score: " + score, 10, 30);

        if (totalBricks <= 0) {
            play = false;
            ballXDir = 0;
            ballYDir = 0;
            g.setColor(Color.green);
            g.setFont(new Font("Arial", Font.BOLD, 30));
            g.drawString("You Won!", 260, 300);
            g.setFont(new Font("Arial", Font.BOLD, 20));
            g.drawString("Press Enter to Restart", 230, 350);
        }

        if (ballPosY > 570) {
            play = false;
            ballXDir = 0;
            ballYDir = 0;
            g.setColor(Color.red);
            g.setFont(new Font("Arial", Font.BOLD, 30));
            g.drawString("Game Over", 250, 300);
            g.setFont(new Font("Arial", Font.BOLD, 20));
            g.drawString("Press Enter to Restart", 230, 350);
        }

        g.dispose();
    }

    public void actionPerformed(ActionEvent e) {
        timer.start();

        if (play) {
            if (new Rectangle(ballPosX, ballPosY, 20, 20).intersects(new Rectangle(paddleX, 550, 100, 8))) {
                ballYDir = -ballYDir;
            }

            A: for (int i = 0; i < brickRowCount; i++) {
                for (int j = 0; j < brickColumnCount; j++) {
                    if (bricks[i][j] == 1) {
                        int brickX = j * 100 + 30;
                        int brickY = i * 40 + 50;
                        int brickWidth = 90;
                        int brickHeight = 30;

                        Rectangle brickRect = new Rectangle(brickX, brickY, brickWidth, brickHeight);
                        Rectangle ballRect = new Rectangle(ballPosX, ballPosY, 20, 20);

                        if (ballRect.intersects(brickRect)) {
                            bricks[i][j] = 0;
                            totalBricks--;
                            score += 5;

                            if (ballPosX + 19 <= brickRect.x || ballPosX + 1 >= brickRect.x + brickRect.width) {
                                ballXDir = -ballXDir;
                            } else {
                                ballYDir = -ballYDir;
                            }

                            break A;
                        }
                    }
                }
            }

            ballPosX += ballXDir;
            ballPosY += ballYDir;

            if (ballPosX < 0) {
                ballXDir = -ballXDir;
            }
            if (ballPosY < 0) {
                ballYDir = -ballYDir;
            }
            if (ballPosX > 670