use bit_vec::BitVec;
use serde::{Deserialize, Serialize};
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

pub fn get_rotation(position: &Vec<Placement>, rotation: &Rotation) -> Vec<Placement> {
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

pub fn get_rotations(position: &Vec<Placement>) -> Vec<Vec<Placement>> {
    let mut result = Vec::new();
    for rotation in [
        Rotation::Degrees90,
        Rotation::Degrees180,
        Rotation::Degrees270,
    ] {
        result.push(get_rotation(position, &rotation));
    }
    result
}

pub fn switch_colors(position: &Vec<Placement>) -> Vec<Placement> {
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

pub fn match_game(position: &Vec<Placement>, moves: &Vec<Placement>) -> Option<usize> {
    let mut last_move_matched: usize = 0;
    for placement in position {
        let index = moves.iter().position(|&m| m == *placement);
        if index.is_none() {
            return None;
        }
        last_move_matched = std::cmp::max(index.unwrap(), last_move_matched);
    }
    Some(last_move_matched)
}

pub fn check_empty(empty: &Vec<Point>, moves: &[Placement]) -> bool {
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

pub fn pack_placements(placements: &Vec<Placement>) -> Vec<u8> {
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
    let point_bytes_end = point_bytes_start + (len as usize * 9 + 7) / 8;
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

pub fn pack_games(games: &HashMap<String, Vec<Placement>>) -> Vec<u8> {
    let mut packed = Vec::new();
    let num_games = games.len() as u32;
    packed.push((num_games >> 24) as u8);
    packed.push((num_games >> 16) as u8);
    packed.push((num_games >> 8) as u8);
    packed.push(num_games as u8);

    for (name, placements) in games {
        let name_bytes = name.as_bytes();
        let name_len = name_bytes.len() as u16;
        packed.push((name_len >> 8) as u8);
        packed.push(name_len as u8);
        packed.extend(name_bytes);
        packed.extend(pack_placements(&placements));
    }

    packed
}

pub fn unpack_games(packed: &[u8]) -> HashMap<String, Vec<Placement>> {
    let mut games = HashMap::new();
    let mut offset = 0;

    let num_games = ((packed[offset] as u32) << 24)
        | ((packed[offset + 1] as u32) << 16)
        | ((packed[offset + 2] as u32) << 8)
        | (packed[offset + 3] as u32);
    offset += 4;

    for _ in 0..num_games {
        let name_len = ((packed[offset] as u16) << 8) | (packed[offset + 1] as u16);
        offset += 2;

        let name = String::from_utf8(packed[offset..offset + name_len as usize].to_vec())
            .expect("Invalid UTF-8 in game name");
        offset += name_len as usize;

        let placements = unpack_placements(&packed[offset..]);
        offset += 2 + (placements.len() * 9 + 7) / 8 + (placements.len() + 7) / 8;

        games.insert(name, placements);
    }

    games
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
}
