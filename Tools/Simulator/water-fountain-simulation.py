import sys
import random
import time
import math
import pygame

# Constants for the simulation
FPS = 60
WIDTH = 800
HEIGHT = 600
MAX_PARTICLES = 5000
PARTICLE_GENERATION_RATE = 50

# Color definitions for various elements
COLOR_BLUE = (0, 0, 255, 50)
COLOR_CYAN = (0, 255, 255, 50)
COLOR_SKY_BLUE = (135, 206, 235)
COLOR_WHITE = (255, 255, 255)
COLOR_GRAY = (169, 169, 169)
COLOR_DARK_GRAY = (105, 105, 105)

# Class representing a particle in the fountain
class Particle:

    def __init__(self):
        # Initializing particle's position and velocity
        self.x = 0
        self.y = 0
        self.v_x = 0
        self.v_y = 0
        self.color = COLOR_BLUE
    # Update particle's position and velocity based on gravity and wind
    def update(self, dtime: float, gravity: float, wind: float) -> None:
        self.x += self.v_x * dtime + wind * dtime
        self.y += self.v_y * dtime
        self.v_y += gravity * dtime
    # Set particle's initial position, velocity, and color
    def set(self, x, y, v_x, v_y, color):
        self.x = x
        self.y = y
        self.v_x = v_x
        self.v_y = v_y
        self.color = color
    # Draw particle on the screen
    def draw(self, screen):
        pygame.draw.circle(screen, self.color, (int(self.x), int(self.y)), 2)
# Class representing the fountain
class Fountain:

    def __init__(self, max_particles: int, particles_per_frame: int, spread: float, gravity: float, wind: float):
        # Initialize fountain properties
        self.particles_per_frame = particles_per_frame
        self.max_particles = max_particles
        self.spread = spread
        self.gravity = gravity
        self.wind = wind
        self.source_x = WIDTH // 2
        self.source_y = HEIGHT - 50
        self.particles = []
    # Update all particles in the fountain
    def update(self, dtime) -> None:
        new_particles = [self.init_particle(Particle()) for _ in range(self.particles_per_frame)]
        self.particles.extend(new_particles)

        for particle in self.particles:
            particle.update(dtime, self.gravity, self.wind)
            if particle.y > HEIGHT - 10 or particle.x < 0 or particle.x > WIDTH:
                self.init_particle(particle)
    # Render all particles and the fountain structure on the screen
    def render(self, screen) -> None:
        screen.fill(COLOR_SKY_BLUE)
        
        pygame.draw.rect(screen, COLOR_DARK_GRAY, (self.source_x - 50, self.source_y, 100, 20))
        pygame.draw.rect(screen, COLOR_GRAY, (self.source_x - 60, self.source_y + 20, 120, 20))
        pygame.draw.rect(screen, COLOR_WHITE, (self.source_x - 12, self.source_y - 200, 25, 200))
        pygame.draw.polygon(screen, COLOR_WHITE, [(self.source_x - 12, self.source_y - 200), (self.source_x + 12, self.source_y - 200), (self.source_x, self.source_y - 230)])
        
        for particle in self.particles:
            particle.draw(screen)
        
        pygame.display.flip()
    # Initialize particle with a random position and velocity
    def init_particle(self, particle: Particle) -> Particle:
        radius = random.random() * self.spread
        direction = random.random() * math.pi * 2
        v_x = radius * math.cos(direction)
        v_y = -random.uniform(150, 200)
        color = COLOR_BLUE if random.random() > 0.5 else COLOR_CYAN
        particle.set(self.source_x, self.source_y - 230, v_x, v_y, color)
        return particle
        
# Initialize Pygame and create the renderer (window)
def make_renderer():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT), pygame.RESIZABLE)
    pygame.display.set_caption("Water Fountain Simulation")
    return screen

# Limit the frame rate of the simulation
def limit_frame_rate(fps: float, cur_time: int) -> bool:
    dtime = time.time() - cur_time
    frame_duration = 1 / fps
    if dtime < frame_duration:
        time.sleep(frame_duration - dtime)
        return True
    return False

# Handle user input and events
def handle_events() -> bool:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            return False
    return True

# Prompt user for input to configure the simulation
def prompt_user():
    print("Welcome to the Water Fountain Simulation!")
    while True:
        print("\n1. Start simulation")
        print("2. Exit")

        choice = input("Enter your choice: ")

        if choice == "1":
            density = int(input("Enter particle density (1-10000): "))
            spread = float(input("Enter particle spread (1-20): "))
            gravity = float(input("Enter gravity (0-20): ")) * 10
            wind = float(input("Enter wind speed (0-10): "))
            fountain = Fountain(MAX_PARTICLES, density // 100, spread, gravity, wind)
            screen = make_renderer()
            main_loop(screen, fountain)

        elif choice == "2":
            print("Exiting...")
            break
        else:
            print("Invalid choice. Please try again.")
            
# Main animation loop
def main_loop(screen, fountain: Fountain) -> None:
    running = True
    cur_time = time.time()

    while running:
        fountain.render(screen)
        fountain.update(1/FPS)
        cur_time = time.time()
        
        if not handle_events():
            break

        limit_frame_rate(FPS, cur_time)

    pygame.quit()

# Display instructions for using the simulation
def display_instructions():
    print("\nInstructions:")
    print("1. Use the prompt to configure the simulation.")
    print("2. Enter the desired particle density, spread, gravity, and wind speed.")
    print("3. Watch the fountain simulation in the Pygame window.")
    print("4. Close the window to exit the simulation.")

def additional_features():
    """Add some extra features or variations to the fountain"""
    print("\nAdditional Features:")
    print("1. Change the background color")
    print("2. Modify the fountain's structure")
    change_background_color()

def change_background_color():
    """Change the background color of the simulation"""
    global COLOR_SKY_BLUE
    print("\nChange Background Color:")
    print("1. Sky Blue")
    print("2. Light Green")
    print("3. Light Yellow")
    print("4. Light Pink")

    choice = input("Enter your choice: ")

    if choice == "1":
        COLOR_SKY_BLUE = (135, 206, 235)
    elif choice == "2":
        COLOR_SKY_BLUE = (144, 238, 144)
    elif choice == "3":
        COLOR_SKY_BLUE = (255, 255, 224)
    elif choice == "4":
        COLOR_SKY_BLUE = (255, 182, 193)
    else:
        print("Invalid choice. Default color will be used.")

# Modify the structure of the fountain
def modify_fountain_structure():
    global HEIGHT, WIDTH, FPS, MAX_PARTICLES, PARTICLE_GENERATION_RATE
    print("\nModify Fountain Structure:")
    HEIGHT = int(input("Enter new height of the simulation window: "))
    WIDTH = int(input("Enter new width of the simulation window: "))
    FPS = int(input("Enter new frame rate (FPS): "))
    MAX_PARTICLES = int(input("Enter new maximum number of particles: "))
    PARTICLE_GENERATION_RATE = int(input("Enter new particle generation rate per frame: "))

# Main function to run the simulation
def main():
    display_instructions()
    additional_features()
    prompt_user()

if __name__ == "__main__":
    main()
