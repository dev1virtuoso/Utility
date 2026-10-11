import math
import multiprocessing
import sys
import time
import pygame

pygame.init()
WIDTH, HEIGHT = 1200, 800
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption(
    "Hercules vs. Hydra"
)
clock = pygame.time.Clock()

font_large = pygame.font.SysFont("Arial", 20, bold=True)
font_small = pygame.font.SysFont("Arial", 14)

NUM_CORES = multiprocessing.cpu_count()

class HydraNode:

  def __init__(self, x, y, angle, parent=None):
    self.x = x
    self.y = y
    self.angle = angle
    self.parent = parent
    self.children = []
    self.alive = True
    self.radius = 10

root_nodes = []
history = []
cut_count = 0
base_x, base_y = WIDTH // 2, HEIGHT - 100

def reset_simulation():
  global root_nodes, history, cut_count
  root_nodes = []
  for angle_offset in [-0.5, 0.0, 0.5]:
    angle = -math.pi / 2 + angle_offset
    length = 90
    nx = base_x + math.cos(angle) * length
    ny = base_y + math.sin(angle) * length
    node = HydraNode(nx, ny, angle)
    root_nodes.append(node)

  history = [count_active_heads()]
  cut_count = 0

def count_active_heads():
  def count_recursive(node):
    if not node.alive:
      return sum(count_recursive(child) for child in node.children)
    else:
      if not node.children:
        return 1
      return sum(count_recursive(child) for child in node.children)

  return sum(count_recursive(r) for r in root_nodes)

def get_all_active_nodes(node, active_list):
  if node.alive:
    if not node.children:
      active_list.append(node)
    else:
      for child in node.children:
        get_all_active_nodes(child, active_list)
  else:
    for child in node.children:
      get_all_active_nodes(child, active_list)

def expand_batch(head_data_chunk):
  new_nodes_data = []
  for hx, hy, hangle in head_data_chunk:
    length = 70
    for offset in [-0.45, 0.45]:
      new_angle = max(-math.pi + 0.1, min(-0.1, hangle + offset))
      nx = hx + math.cos(new_angle) * length
      ny = hy + math.sin(new_angle) * length
      new_nodes_data.append((nx, ny, new_angle))
  return new_nodes_data

if __name__ == "__main__":
  reset_simulation()
  running = True
  auto_mode = True
  pool = multiprocessing.Pool(processes=NUM_CORES)

  last_tick = time.time()

  while running:
    screen.fill((20, 24, 33))

    for event in pygame.event.get():
      if event.type == pygame.QUIT:
        running = False
      elif event.type == pygame.KEYDOWN:
        if event.key == pygame.K_r:
          reset_simulation()
        elif event.key == pygame.K_SPACE:
          auto_mode = not auto_mode
        elif event.key == pygame.K_ESCAPE:
          running = False

    if auto_mode:
      active_heads = []
      for r in root_nodes:
        get_all_active_nodes(r, active_heads)

      if active_heads:
        max_batch = 5000 if len(active_heads) > 5000 else len(active_heads)
        heads_to_chop = active_heads[:max_batch]

        chunk_size = max(1, len(heads_to_chop) // NUM_CORES)
        chunks = [
            [(h.x, h.y, h.angle) for h in heads_to_chop[i : i + chunk_size]]
            for i in range(0, len(heads_to_chop), chunk_size)
        ]

        results = pool.map(expand_batch, chunks)

        idx = 0
        for chunk_res in results:
          for nx, ny, n_angle in chunk_res:
            if idx < len(heads_to_chop):
              head = heads_to_chop[idx]
              head.alive = False
              cut_count += 1
              child_node = HydraNode(nx, ny, n_angle, parent=head)
              head.children.append(child_node)
            idx += 1
            
        flat_new_data = [item for sublist in results for item in sublist]
        for i, head in enumerate(heads_to_chop):
          head.alive = False
          cut_count += 1
          nx1, ny1, ang1 = flat_new_data[i * 2]
          nx2, ny2, ang2 = flat_new_data[i * 2 + 1]
          head.children.append(HydraNode(nx1, ny1, ang1, parent=head))
          head.children.append(HydraNode(nx2, ny2, ang2, parent=head))

        history.append(count_active_heads())
        if len(history) > 200:
          history.pop(0)

    pygame.draw.ellipse(
        screen, (100, 50, 20), (base_x - 70, base_y - 20, 140, 50)
    )

    current_heads = count_active_heads()

    def draw_tree(node, depth=0):
      if depth > 12:
        return
      p_x, p_y = (
          (node.parent.x, node.parent.y) if node.parent else (base_x, base_y)
      )

      if not node.alive:
        pygame.draw.line(screen, (70, 70, 70), (p_x, p_y), (node.x, node.y), 2)
      else:
        pygame.draw.line(screen, (60, 130, 180), (p_x, p_y), (node.x, node.y), 3)
        if depth < 8:
          pygame.draw.circle(
              screen,
              (46, 139, 87),
              (int(node.x), int(node.y)),
              max(3, node.radius - depth),
          )

      for child in node.children:
        draw_tree(child, depth + 1)

    for r in root_nodes:
      draw_tree(r)

    panel_rect = pygame.Rect(WIDTH - 320, HEIGHT - 220, 300, 200)
    panel_surf = pygame.Surface(
        (panel_rect.width, panel_rect.height), pygame.SRCALPHA
    )
    panel_surf.fill((30, 35, 45, 240))
    screen.blit(panel_surf, panel_rect.topleft)
    pygame.draw.rect(screen, (70, 80, 100), panel_rect, 2, border_radius=8)

    title_surf = font_large.render(
        "Multi-Core Hydra Engine", True, (255, 255, 255)
    )
    screen.blit(title_surf, (panel_rect.x + 15, panel_rect.y + 12))

    cores_text = font_small.render(
        f"Active CPU Cores: {NUM_CORES}", True, (100, 200, 255)
    )
    heads_text = font_small.render(
        f"Total Active Heads: {current_heads}", True, (46, 139, 87)
    )
    cuts_text = font_small.render(
        f"Total Slashes: {cut_count}", True, (255, 120, 120)
    )

    screen.blit(cores_text, (panel_rect.x + 15, panel_rect.y + 42))
    screen.blit(heads_text, (panel_rect.x + 15, panel_rect.y + 65))
    screen.blit(cuts_text, (panel_rect.x + 15, panel_rect.y + 88))

    chart_rect = pygame.Rect(
        panel_rect.x + 15, panel_rect.y + 115, panel_rect.width - 30, 70
    )
    pygame.draw.rect(screen, (20, 24, 33), chart_rect)
    pygame.draw.rect(screen, (60, 70, 90), chart_rect, 1)

    if len(history) > 1:
      max_h = max(history) if max(history) > 5 else 5
      points = []
      max_pts = chart_rect.width - 10
      recent_history = history[-max_pts:] if len(history) > max_pts else history

      for i, h in enumerate(recent_history):
        px = chart_rect.x + 5 + int(i * (chart_rect.width - 10) / max(1, len(recent_history) - 1))
        py = (
            chart_rect.y
            + chart_rect.height
            - 5
            - int((math.log10(h + 1) / math.log10(max_h + 1)) * (chart_rect.height - 10))
        )
        points.append((px, py))

      if len(points) > 1:
        pygame.draw.aalines(screen, (255, 107, 107), False, points)

    status_str = "AUTO-CHOPPING (Max Speed)" if auto_mode else "PAUSED"
    screen.blit(
        font_small.render(f"Status: {status_str}", True, (255, 215, 0)),
        (20, 20),
    )
    screen.blit(
        font_small.render(
            "Press 'SPACE' to Pause/Resume | 'R' to Reset | 'ESC' to Exit",
            True,
            (180, 180, 180),
        ),
        (20, 44),
    )

    pygame.display.flip()
    clock.tick(60)

  pool.close()
  pool.join()
  pygame.quit()
  sys.exit()