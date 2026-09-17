// BoardView desk screen case
// Waveshare 5inch DSI LCD (C) + Raspberry Pi 4B in the stand, not behind the glass.
//
// Dimensions from Waveshare 5inch-DSI-LCD-C.pdf (2024-10-17 drawing):
//   glass 120.7 x 77.7, view 109.0 x 65.8, left bezel 5.85, bottom bezel 8.3
//   PCB 121 x 76, corner holes 4mm inset, Pi holes 58 x 49
// Pi 4 from raspberrypi.com mechanical drawing: 85 x 56, holes 58 x 49, USB-C at x=7.7
//
// Print PETG, 0.2mm, 20% infill. Bezel/back/lid flat on the bed. Base on its bottom.
//   openscad -o stl/bezel.stl -D 'part="bezel"' case.scad
//   openscad -o stl/back.stl  -D 'part="back"'  case.scad
//   openscad -o stl/base.stl  -D 'part="base"'  case.scad
//   openscad -o stl/lid.stl   -D 'part="lid"'   case.scad

part = "preview"; // bezel | back | base | lid | preview

$fn = 48;

glass_w = 120.7;
glass_h = 77.7;
view_w  = 109.0;
view_h  = 65.8;
view_left = 5.85;
view_bottom = 8.3;

pcb_w = 121.0;
pcb_h = 76.0;
pcb_hole_inset = 4.0;

wall = 2.2;
gap = 0.45;
lip = 1.4;
glass_z = 1.8;
pcb_z = 1.6;
comp_z = 8.0;
back_z = 2.2;

overlap = 0.9;
fillet = 2.4;

screw_d = 2.6;
boss_d = 6.2;

pi_w = 85.0;
pi_d = 56.0;
pi_h = 16.0;
pi_hole = 58.0;
pi_hole_y = 49.0;
pi_usbc_x = 7.7;
pi_clear = 1.4;

tilt = 60;

outer_w = max(glass_w, pcb_w) + 2 * (wall + gap);
outer_h = max(glass_h, pcb_h) + 2 * (wall + gap);
screen_z = lip + glass_z + pcb_z + comp_z + back_z;

base_w = outer_w + 4;
base_d = 86;
base_h = 46;
lid_z = 2.2;

module rrect(w, h, r) {
  offset(r = r)
    square([max(w - 2 * r, 0.1), max(h - 2 * r, 0.1)], center = true);
}

module rbox(w, h, z, r) {
  linear_extrude(z) rrect(w, h, r);
}

module pcb_holes() {
  ow = max(glass_w, pcb_w);
  oh = max(glass_h, pcb_h);
  ox = wall + gap + (ow - pcb_w) / 2;
  oy = wall + gap + (oh - pcb_h) / 2;
  for (x = [pcb_hole_inset, pcb_w - pcb_hole_inset],
       y = [pcb_hole_inset, pcb_h - pcb_hole_inset])
    translate([ox + x, oy + y, 0]) children();
}

module window_cut() {
  ow = max(glass_w, pcb_w);
  oh = max(glass_h, pcb_h);
  gx = wall + gap + (ow - glass_w) / 2;
  gy = wall + gap + (oh - glass_h) / 2;
  translate([
    gx + view_left + overlap,
    gy + view_bottom + overlap,
    -1
  ])
    cube([
      view_w - 2 * overlap,
      view_h - 2 * overlap,
      lip + 2
    ]);
}

module glass_pocket() {
  ow = max(glass_w, pcb_w);
  oh = max(glass_h, pcb_h);
  gx = wall + gap + (ow - glass_w) / 2;
  gy = wall + gap + (oh - glass_h) / 2;
  translate([gx - gap / 2, gy - gap / 2, lip])
    cube([glass_w + gap, glass_h + gap, glass_z + 0.3]);
}

module pcb_pocket() {
  ow = max(glass_w, pcb_w);
  oh = max(glass_h, pcb_h);
  ox = wall + gap + (ow - pcb_w) / 2;
  oy = wall + gap + (oh - pcb_h) / 2;
  translate([ox - gap / 2, oy - gap / 2, lip + glass_z])
    cube([pcb_w + gap, pcb_h + gap, pcb_z + comp_z + 1]);
}

module bezel() {
  z = lip + glass_z + pcb_z + 1.2;
  difference() {
    union() {
      difference() {
        rbox(outer_w, outer_h, z, fillet);
        translate([-outer_w / 2, -outer_h / 2, 0]) {
          window_cut();
          glass_pocket();
          pcb_pocket();
        }
      }
      translate([-outer_w / 2, -outer_h / 2, 0])
        pcb_holes()
          cylinder(d = boss_d, h = z);
    }
    translate([-outer_w / 2, -outer_h / 2, 0]) {
      window_cut();
      pcb_holes()
        translate([0, 0, -1])
          cylinder(d = 2.2, h = z + 2);
    }
  }
}

module back() {
  difference() {
    union() {
      rbox(outer_w, outer_h, back_z, fillet);
      translate([-outer_w / 2, -outer_h / 2, back_z])
        pcb_holes()
          cylinder(d = boss_d, h = 1.6);
    }
    translate([-outer_w / 2, -outer_h / 2, -1])
      pcb_holes()
        cylinder(d = screw_d, h = back_z + 8);
    translate([0, -outer_h / 2 + 7, back_z / 2])
      cube([16, 3.2, back_z + 6], center = true);
    for (i = [-2, -1, 0, 1, 2])
      translate([i * 10, 10, back_z / 2])
        cube([3.2, 18, back_z + 4], center = true);
  }
}

// Y = 0 at the back (USB-C), +Y toward the student. Z up.
// Slope is `tilt` degrees from the desk.
function slope_y() = (base_h - 12) / tan(tilt);

module base_profile() {
  sy = slope_y();
  polygon([
    [0, 0],
    [base_d, 0],
    [base_d, 12],
    [base_d - sy, base_h],
    [0, 24]
  ]);
}

module base_body() {
  translate([-base_w / 2, 0, 0])
    rotate([90, 0, 90])
      linear_extrude(base_w)
        offset(r = 1.2)
          offset(delta = -1.2)
            base_profile();
}

module screen_slot() {
  sy = slope_y();
  translate([0, base_d - sy + 6, base_h - 4])
    rotate([tilt, 0, 0])
      translate([0, 8, 0])
        cube([outer_w + 0.8, 18, screen_z + 1.0], center = true);
}

module pi_pocket() {
  translate([
    -pi_w / 2 - pi_clear,
    wall + 2,
    lid_z + 0.2
  ])
    cube([
      pi_w + pi_clear * 2,
      pi_d + pi_clear * 2 + 4,
      pi_h + 6
    ]);
}

module base() {
  difference() {
    base_body();
    screen_slot();
    pi_pocket();
    // Open the back so the Pi slides in; the lid closes it.
    translate([-pi_w / 2 - pi_clear, -1, lid_z + 0.2])
      cube([pi_w + pi_clear * 2, wall + 6, pi_h + 6]);
    // USB-C through the lid plane (cut the body too, in case)
    translate([-pi_w / 2 + pi_usbc_x, 0, lid_z + 5])
      cube([12, 16, 8], center = true);
    // DSI ribbon from the slot down to the Pi
    translate([0, base_d / 2, 20])
      cube([14, 40, 8], center = true);
    // Lid screw holes
    for (x = [-base_w / 2 + 8, base_w / 2 - 8],
         y = [8, base_d - 10])
      translate([x, y, -1])
        cylinder(d = 2.2, h = lid_z + 6);
  }
  // Pi mounting bosses (M2.5 self-tap)
  translate([-pi_w / 2, wall + 4, lid_z])
    for (x = [3.5, 3.5 + pi_hole], y = [3.5, 3.5 + pi_hole_y])
      translate([x, y, 0])
        difference() {
          cylinder(d = 6, h = 3);
          translate([0, 0, -1])
            cylinder(d = 2.2, h = 6);
        }
}

module lid() {
  difference() {
    translate([0, base_d / 2, 0])
      rbox(base_w, base_d, lid_z, 1.2);
    for (x = [-base_w / 2 + 8, base_w / 2 - 8],
         y = [8, base_d - 10])
      translate([x, y, -1])
        cylinder(d = screw_d, h = lid_z + 4);
    translate([-pi_w / 2 + pi_usbc_x, 0, lid_z / 2])
      cube([12, 10, lid_z + 4], center = true);
  }
}

module preview() {
  sy = slope_y();
  color("#f5f5f7") base();
  color("#e4e4e7")
    translate([0, 0, -lid_z - 0.2])
      lid();
  color("#e8e8ed")
    translate([0, base_d - sy + 2, base_h - 2])
      rotate([tilt, 0, 0])
        translate([0, outer_h / 2 - 4, 0]) {
          bezel();
          translate([0, 0, screen_z - back_z])
            color("#d2d2d7") back();
        }
}

if (part == "bezel") bezel();
else if (part == "back") back();
else if (part == "base") base();
else if (part == "lid") lid();
else preview();
