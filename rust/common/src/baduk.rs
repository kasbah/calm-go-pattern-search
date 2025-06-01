use bit_vec::BitVec;
use rmp_serde::{Deserializer, Serializer};
use serde::{Deserialize, Serialize};
use serde_bytes;
use std::collections::HashMap;

pub const BOARD_SIZE: u8 = 19;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Color {
    Black,
    White,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Point {
    pub x: u8,
    pub y: u8,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Placement {
    pub color: Color,
    pub point: Point,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Rotation {
    Degrees90,
    Degrees180,
    Degrees270,
}

impl Rotation {
    pub fn from_int(i: u8) -> Rotation {
        match i {
            0 => Rotation::Degrees90,
            1 => Rotation::Degrees180,
            2 => Rotation::Degrees270,
            _ => panic!("Invalid rotation index"),
        }
    }
}

pub fn get_rotated(position: &[Placement], rotation: &Rotation) -> Vec<Placement> {
    match rotation {
        Rotation::Degrees90 => position
            .iter()
            .map(|p| Placement {
                color: p.color,
                point: Point {
                    x: BOARD_SIZE - p.point.y - 1,
                    y: p.point.x,
                },
            })
            .collect(),
        Rotation::Degrees180 => position
            .iter()
            .map(|p| Placement {
                color: p.color,
                point: Point {
                    x: BOARD_SIZE - p.point.x - 1,
                    y: BOARD_SIZE - p.point.y - 1,
                },
            })
            .collect(),
        Rotation::Degrees270 => position
            .iter()
            .map(|p| Placement {
                color: p.color,
                point: Point {
                    x: p.point.y,
                    y: BOARD_SIZE - p.point.x - 1,
                },
            })
            .collect(),
    }
}

pub fn get_rotations(position: &[Placement]) -> Vec<Vec<Placement>> {
    let mut result = Vec::new();
    for rotation in [
        Rotation::Degrees90,
        Rotation::Degrees180,
        Rotation::Degrees270,
    ] {
        result.push(get_rotated(position, &rotation));
    }
    result
}

pub fn get_mirrored(position: &[Placement]) -> Vec<Placement> {
    position
        .iter()
        .map(|p| Placement {
            color: p.color,
            point: Point {
                x: BOARD_SIZE - p.point.x - 1,
                y: p.point.y,
            },
        })
        .collect()
}

pub fn switch_colors(position: &[Placement]) -> Vec<Placement> {
    position
        .iter()
        .map(|p| Placement {
            color: if p.color == Color::White {
                Color::Black
            } else {
                Color::White
            },
            point: p.point,
        })
        .collect()
}

pub fn match_game(position: &[Placement], moves: &[Placement]) -> Option<usize> {
    let mut last_move_matched: usize = 0;
    for placement in position {
        let index = moves.iter().position(|&m| m == *placement)?;
        last_move_matched = std::cmp::max(index, last_move_matched);
    }
    Some(last_move_matched)
}

pub fn check_empty(empty: &[Point], moves: &[Placement]) -> bool {
    for placement in moves {
        if empty.contains(&placement.point) {
            return false;
        }
    }
    true
}

pub fn get_surrounding_points(point: &Point, range: u8) -> Vec<Point> {
    let mut result = Vec::new();
    let px = point.x as i8;
    let py = point.y as i8;
    let board_size = BOARD_SIZE as i8;
    let r = range as i8;
    for x in (px - r)..=(px + r) {
        for y in (py - r)..=(py + r) {
            if x >= 0 && x < board_size && y >= 0 && y < board_size && (px != x || py != y) {
                result.push(Point {
                    x: x as u8,
                    y: y as u8,
                });
            }
        }
    }
    result
}

pub fn pack_placements(placements: &[Placement]) -> Vec<u8> {
    let points: Vec<u16> = placements
        .iter()
        .map(|p| p.point.x as u16 * BOARD_SIZE as u16 + p.point.y as u16)
        .collect();

    let mut point_bits = BitVec::new();
    for point in points {
        for i in 0..=8 {
            point_bits.push((point & (1 << (8 - i))) != 0);
        }
    }

    let color_bools: Vec<bool> = placements.iter().map(|p| p.color == Color::Black).collect();
    let mut color_bits = BitVec::new();
    for color in color_bools {
        color_bits.push(color);
    }

    let len = placements.len() as u16;

    let mut packed = Vec::new();
    packed.push((len >> 8) as u8);
    packed.push(len as u8);

    packed.extend(&point_bits.to_bytes());
    packed.extend(&color_bits.to_bytes());

    packed
}

pub fn unpack_placements(packed: &[u8]) -> Vec<Placement> {
    let len = ((packed[0] as u16) << 8) | (packed[1] as u16);
    let point_bytes_start = 2;
    let point_bytes_end = point_bytes_start + (len as usize * 9).div_ceil(8);
    let color_bytes_start = point_bytes_end;

    let point_bits = BitVec::from_bytes(&packed[point_bytes_start..point_bytes_end]);
    let color_bits = BitVec::from_bytes(&packed[color_bytes_start..]);

    let mut placements = Vec::new();
    for i in 0..len as usize {
        let mut point_value: u16 = 0;
        for j in 0..9 {
            if point_bits[i * 9 + j] {
                point_value |= 1 << (8 - j);
            }
        }

        let x = (point_value / BOARD_SIZE as u16) as u8;
        let y = (point_value % BOARD_SIZE as u16) as u8;
        let color = if color_bits[i] {
            Color::Black
        } else {
            Color::White
        };

        placements.push(Placement {
            point: Point { x, y },
            color,
        });
    }

    placements
}

#[derive(Serialize, Deserialize)]
struct PackedGame {
    name: String,
    #[serde(with = "serde_bytes")]
    placements: Vec<u8>,
}

pub fn pack_games(games: &HashMap<String, Vec<Placement>>) -> Vec<u8> {
    let packed_games: Vec<PackedGame> = games
        .iter()
        .map(|(name, placements)| PackedGame {
            name: name.clone(),
            placements: pack_placements(placements),
        })
        .collect();

    let mut buf = Vec::new();
    packed_games
        .serialize(&mut Serializer::new(&mut buf))
        .expect("Failed to serialize games");
    buf
}

pub fn unpack_games(packed: &[u8]) -> HashMap<String, Vec<Placement>> {
    let mut deserializer = Deserializer::new(packed);
    let packed_games: Vec<PackedGame> =
        Vec::<PackedGame>::deserialize(&mut deserializer).expect("Failed to deserialize games");

    packed_games
        .into_iter()
        .map(|game| (game.name, unpack_placements(&game.placements)))
        .collect()
}

pub fn check_within_one_quadrant(position: &Vec<Placement>) -> bool {
    if position.is_empty() {
        return true;
    }

    let mid = BOARD_SIZE / 2;
    let mut quadrant = None;

    for placement in position {
        let x = placement.point.x;
        let y = placement.point.y;

        // Return false if point is on middle lines
        if x == mid || y == mid {
            return false;
        }

        let current_quadrant = match (x < mid, y < mid) {
            (true, true) => 0,   // Top-left
            (false, true) => 1,  // Top-right
            (true, false) => 2,  // Bottom-left
            (false, false) => 3, // Bottom-right
        };

        match quadrant {
            None => quadrant = Some(current_quadrant),
            Some(q) if q != current_quadrant => return false,
            _ => continue,
        }
    }

    true
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    #[test]
    fn test_get_surrounding_points_range1() {
        let point = Point { x: 1, y: 1 };
        let surrounding_points = get_surrounding_points(&point, 1);
        assert_eq!(surrounding_points.len(), 8);
        assert!(surrounding_points.contains(&Point { x: 0, y: 0 }));
        assert!(surrounding_points.contains(&Point { x: 0, y: 1 }));
        assert!(surrounding_points.contains(&Point { x: 1, y: 0 }));
        assert!(surrounding_points.contains(&Point { x: 2, y: 0 }));
        assert!(surrounding_points.contains(&Point { x: 2, y: 1 }));
        assert!(surrounding_points.contains(&Point { x: 0, y: 2 }));
        assert!(surrounding_points.contains(&Point { x: 1, y: 2 }));
    }

    #[test]
    fn test_get_surrounding_points_at_corner() {
        let point = Point { x: 0, y: 0 };
        let surrounding_points = get_surrounding_points(&point, 1);
        assert_eq!(surrounding_points.len(), 3);
        assert!(surrounding_points.contains(&Point { x: 0, y: 1 }));
        assert!(surrounding_points.contains(&Point { x: 1, y: 0 }));
        assert!(surrounding_points.contains(&Point { x: 1, y: 1 }));
    }

    #[test]
    fn test_get_surrounding_points_at_other_corner() {
        let point = Point {
            x: BOARD_SIZE - 1,
            y: BOARD_SIZE - 1,
        };
        let surrounding_points = get_surrounding_points(&point, 1);
        assert_eq!(surrounding_points.len(), 3);
        assert!(surrounding_points.contains(&Point {
            x: BOARD_SIZE - 2,
            y: BOARD_SIZE - 1
        }));
        assert!(surrounding_points.contains(&Point {
            x: BOARD_SIZE - 1,
            y: BOARD_SIZE - 2
        }));
        assert!(surrounding_points.contains(&Point {
            x: BOARD_SIZE - 2,
            y: BOARD_SIZE - 2
        }));
    }

    #[test]
    fn test_surrounding_points_range2() {
        let point = Point { x: 3, y: 3 };
        let surrounding_points = get_surrounding_points(&point, 2);
        assert_eq!(surrounding_points.len(), 24);
    }

    #[test]
    fn test_surrounding_points_range2_at_corner() {
        let point = Point { x: 0, y: 0 };
        let surrounding_points = get_surrounding_points(&point, 2);
        assert_eq!(surrounding_points.len(), 8);
    }

    #[test]
    fn test_surrounding_points_range2_1_1_point() {
        let point = Point { x: 1, y: 1 };
        let surrounding_points = get_surrounding_points(&point, 2);
        assert_eq!(surrounding_points.len(), 15);
    }

    #[test]
    fn test_get_mirrored() {
        let position = vec![
            Placement {
                color: Color::Black,
                point: Point { x: 0, y: 0 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 18, y: 5 },
            },
            Placement {
                color: Color::Black,
                point: Point { x: 9, y: 9 },
            },
        ];

        let mirrored = get_mirrored(&position);
        assert_eq!(mirrored.len(), 3);
        assert!(mirrored.contains(&Placement {
            color: Color::Black,
            point: Point { x: 18, y: 0 },
        }));
        assert!(mirrored.contains(&Placement {
            color: Color::White,
            point: Point { x: 0, y: 5 },
        }));
        assert!(mirrored.contains(&Placement {
            color: Color::Black,
            point: Point { x: 9, y: 9 },
        }));
    }

    proptest! {
        #[test]
        fn test_pack_unpack_placements(placements in prop::collection::vec(
            (any::<bool>(), any::<u8>(), any::<u8>()),
            0..500
        ).prop_map(|v| v.into_iter().map(|(is_black, x, y)| {
            Placement {
                color: if is_black { Color::Black } else { Color::White },
                point: Point {
                    x: x % BOARD_SIZE,
                    y: y % BOARD_SIZE
                }
            }
        }).collect::<Vec<_>>())) {
            let packed = pack_placements(&placements);
            let unpacked = unpack_placements(&packed);
            assert_eq!(placements, unpacked);
        }
    }

    proptest! {
        #[test]
        fn test_pack_unpack_games(games in prop::collection::hash_map(
            "[\\p{L}\\p{N}\\p{P}\\p{Zs}]{1,20}", // Unicode letters, numbers, punctuation, spaces
            prop::collection::vec(
                (any::<bool>(), any::<u8>(), any::<u8>()),
                0..100
            ).prop_map(|v| v.into_iter().map(|(is_black, x, y)| {
                Placement {
                    color: if is_black { Color::Black } else { Color::White },
                    point: Point {
                        x: x % BOARD_SIZE,
                        y: y % BOARD_SIZE
                    }
                }
            }).collect::<Vec<_>>()),
            0..10 // Number of games
        )) {
            let packed = pack_games(&games);
            let unpacked = unpack_games(&packed);
            assert_eq!(games, unpacked);
        }

        #[test]
        fn test_pack_unpack_games_with_empty_games(games in prop::collection::hash_map(
            "[\\p{L}\\p{N}\\p{P}\\p{Zs}]{1,20}",
            prop::collection::vec(
                (any::<bool>(), any::<u8>(), any::<u8>()),
                0..=0 // Empty placements
            ).prop_map(|v| v.into_iter().map(|(is_black, x, y)| {
                Placement {
                    color: if is_black { Color::Black } else { Color::White },
                    point: Point {
                        x: x % BOARD_SIZE,
                        y: y % BOARD_SIZE
                    }
                }
            }).collect::<Vec<_>>()),
            0..10 // Number of games
        )) {
            let packed = pack_games(&games);
            let unpacked = unpack_games(&packed);
            assert_eq!(games, unpacked);
        }

        #[test]
        fn test_pack_unpack_games_with_single_placement(games in prop::collection::hash_map(
            "[\\p{L}\\p{N}\\p{P}\\p{Zs}]{1,20}",
            prop::collection::vec(
                (any::<bool>(), any::<u8>(), any::<u8>()),
                1..=1 // Exactly one placement per game
            ).prop_map(|v| v.into_iter().map(|(is_black, x, y)| {
                Placement {
                    color: if is_black { Color::Black } else { Color::White },
                    point: Point {
                        x: x % BOARD_SIZE,
                        y: y % BOARD_SIZE
                    }
                }
            }).collect::<Vec<_>>()),
            0..20 // Number of games
        )) {
            let packed = pack_games(&games);
            let unpacked = unpack_games(&packed);
            assert_eq!(games, unpacked);
        }
    }

    proptest! {
        #[test]
        fn test_get_mirrored_property(position in prop::collection::vec(
            (any::<bool>(), any::<u8>(), any::<u8>()),
            0..100
        ).prop_map(|v| v.into_iter().map(|(is_black, x, y)| {
            Placement {
                color: if is_black { Color::Black } else { Color::White },
                point: Point {
                    x: x % BOARD_SIZE,
                    y: y % BOARD_SIZE
                }
            }
        }).collect::<Vec<_>>())) {
            let mirrored = get_mirrored(&position);
            let double_mirrored = get_mirrored(&mirrored);
            assert_eq!(position, double_mirrored);
        }
    }

    #[test]
    fn test_check_within_one_quadrant() {
        // Empty position
        assert!(check_within_one_quadrant(&vec![]));

        // Single placement in top-left quadrant
        assert!(check_within_one_quadrant(&vec![Placement {
            color: Color::Black,
            point: Point { x: 5, y: 5 },
        }]));

        // Multiple placements in top-left quadrant
        assert!(check_within_one_quadrant(&vec![
            Placement {
                color: Color::Black,
                point: Point { x: 5, y: 5 },
            },
            Placement {
                color: Color::White,
                point: Point { x: 7, y: 3 },
            }
        ]));

        // Placements in different quadrants
        assert!(!check_within_one_quadrant(&vec![
            Placement {
                color: Color::Black,
                point: Point { x: 5, y: 5 }, // Top-left
            },
            Placement {
                color: Color::White,
                point: Point { x: 15, y: 15 }, // Bottom-right
            }
        ]));

        // Placements on middle lines
        assert!(!check_within_one_quadrant(&vec![Placement {
            color: Color::Black,
            point: Point { x: 9, y: 5 }, // On vertical middle line
        }]));
        assert!(!check_within_one_quadrant(&vec![Placement {
            color: Color::Black,
            point: Point { x: 5, y: 9 }, // On horizontal middle line
        }]));
        assert!(!check_within_one_quadrant(&vec![Placement {
            color: Color::Black,
            point: Point { x: 9, y: 9 }, // On both middle lines
        }]));
    }
}
