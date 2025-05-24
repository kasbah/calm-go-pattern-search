extern crate cfg_if;
extern crate wasm_bindgen;

mod utils;

pub mod errors;
pub mod sgf_traversal;

use cfg_if::cfg_if;
use rmp_serde::Deserializer;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

cfg_if! {
    if #[cfg(feature = "wee_alloc")] {
        extern crate wee_alloc;
        #[global_allocator]
        static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;
    }
}

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Rotation {
    Degrees90,
    Degrees180,
    Degrees270,
}

#[wasm_bindgen]
pub struct WasmSearch {
    game_data: HashMap<String, Vec<Placement>>,
}

const BOARD_SIZE: u8 = 19;

#[wasm_bindgen]
impl WasmSearch {
    #[wasm_bindgen(constructor)]
    pub fn new() -> WasmSearch {
        let data = include_bytes!("games.pack");
        let mut de = Deserializer::new(&data[..]);
        let game_data: HashMap<String, Vec<Placement>> = Deserialize::deserialize(&mut de).unwrap();
        Self { game_data }
    }

    fn get_rotation(&self, position: &Vec<Placement>, rotation: Rotation) -> Vec<Placement> {
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

    fn get_rotations(&self, position: &Vec<Placement>) -> Vec<Vec<Placement>> {
        let mut result = Vec::new();
        for rotation in &[
            Rotation::Degrees90,
            Rotation::Degrees180,
            Rotation::Degrees270,
        ] {
            result.push(self.get_rotation(position, *rotation));
        }
        result
    }

    fn switch_colors(&self, position: &Vec<Placement>) -> Vec<Placement> {
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

    fn match_game(&self, position: &Vec<Placement>, moves: &Vec<Placement>) -> isize {
        let mut last_placement: isize = -1;
        for placement in position {
            let index = moves.iter().position(|&m| m == *placement);
            if index.is_none() {
                return -1;
            }
            last_placement = std::cmp::max(index.unwrap() as isize, last_placement);
        }
        last_placement
    }

    #[wasm_bindgen]
    pub async fn search(&self, position: Vec<Placement>) -> Vec<SearchResult> {
        if position.is_empty() {
            return Vec::new();
        }
        let mut result = Vec::new();
        let rotations = self.get_rotations(&position);
        let inverse = self.switch_colors(&position);
        let inverse_rotations = self.get_rotations(&inverse);
        for (path, moves) in &self.game_data {
            let mut last_move_matched = self.match_game(&position, moves);
            if last_move_matched != -1 {
                result.push(SearchResult {
                    path: path.clone(),
                    score: 10,
                    last_move_matched,
                });
                continue;
            }
            for rotation in &rotations {
                last_move_matched = self.match_game(rotation, moves);
                if last_move_matched != -1 {
                    result.push(SearchResult {
                        path: path.clone(),
                        score: 10,
                        last_move_matched,
                    });
                    break;
                }
            }
            if last_move_matched == -1 {
                last_move_matched = self.match_game(&inverse, moves);
                if last_move_matched != -1 {
                    result.push(SearchResult {
                        path: path.clone(),
                        score: 9,
                        last_move_matched,
                    });
                    continue;
                }
                for rotation in &inverse_rotations {
                    last_move_matched = self.match_game(rotation, moves);
                    if last_move_matched != -1 {
                        result.push(SearchResult {
                            path: path.clone(),
                            score: 9,
                            last_move_matched,
                        });
                        break;
                    }
                }
            }
        }
        result
    }
}

#[wasm_bindgen]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct SearchResult {
    path: String,
    score: i8,
    last_move_matched: isize,
}

#[wasm_bindgen]
impl SearchResult {
    #[wasm_bindgen(getter)]
    pub fn path(&self) -> String {
        self.path.clone()
    }
    #[wasm_bindgen(getter)]
    pub fn score(&self) -> i8 {
        self.score
    }
    #[wasm_bindgen(getter)]
    pub fn last_move_matched(&self) -> isize {
        self.last_move_matched
    }
}

#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Color {
    Black,
    White,
}

#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Point {
    x: u8,
    y: u8,
}

#[wasm_bindgen]
impl Point {
    #[wasm_bindgen(constructor)]
    pub fn new(x: u8, y: u8) -> Self {
        Self { x, y }
    }
    #[wasm_bindgen(getter)]
    pub fn x(&self) -> u8 {
        self.x
    }
    #[wasm_bindgen(getter)]
    pub fn y(&self) -> u8 {
        self.y
    }
}

#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Placement {
    color: Color,
    point: Point,
}

#[wasm_bindgen]
impl Placement {
    #[wasm_bindgen(constructor)]
    pub fn new(color: Color, point: Point) -> Self {
        Self { color, point }
    }
    #[wasm_bindgen(getter)]
    pub fn color(&self) -> Color {
        self.color
    }
    #[wasm_bindgen(getter)]
    pub fn point(&self) -> Point {
        self.point
    }
}

//#[cfg(test)]
//mod tests {
//    use super::*;
//
//    fn load_sgfs() -> Result<HashMap<String, Vec<Move>>, Box<dyn std::error::Error>> {
//        let mut sgf_folder = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
//        sgf_folder.push("badukmovies-pro-collection");
//
//        let mut games = HashMap::new();
//
//        for entry in jwalk::WalkDir::new(sgf_folder) {
//            let path = entry?.path();
//            if path.extension().map_or(false, |ext| ext == "sgf") {
//                let file_data = std::fs::read_to_string(path.clone())?;
//                if let Ok(game) = go::parse(&file_data) {
//                    let mut moves = Vec::new();
//                    for node in sgf_traversal::variation_nodes(&game[0], 0).unwrap() {
//                        for props in &node.sgf_node.properties {
//                            match props {
//                                go::Prop::W(go::Move::Move(point)) => {
//                                    moves.push(Move {
//                                        color: Color::White,
//                                        point: point.clone(),
//                                    });
//                                    break;
//                                }
//                                go::Prop::B(go::Move::Move(point)) => {
//                                    moves.push(Move {
//                                        color: Color::Black,
//                                        point: point.clone(),
//                                    });
//                                    break;
//                                }
//                                _ => {}
//                            }
//                        }
//                    }
//
//                    games.insert(path.to_string_lossy().into_owned(), moves);
//                }
//            }
//        }
//
//        Ok(games)
//    }
//
//    //#[test]
//    //fn test_load_sgf() {
//    //    let games = load_sgfs().unwrap();
//    //    let mut buf = Vec::new();
//    //    games.serialize(&mut Serializer::new(&mut buf)).unwrap();
//    //    std::fs::write("games.pack", buf).unwrap();
//    //    //let point = Point { x: 3, y: 3 };
//    //    //let color = Color::White;
//    //    //for (path, moves) in games {
//    //    //    for move_ in moves {
//    //    //        if move_.point == point && move_.color == color {
//    //    //            println!("{:?}", path);
//    //    //            break;
//    //    //        }
//    //    //    }
//    //    //}
//    //}
//    #[test]
//    fn test_load_pack() {
//        let data = include_bytes!("games.pack");
//        let mut de = Deserializer::new(&data[..]);
//        let games: HashMap<String, Vec<Move>> = Deserialize::deserialize(&mut de).unwrap();
//        assert!(!games.is_empty());
//        let point = Point { x: 3, y: 3 };
//        let color = Color::White;
//        for (path, moves) in games {
//            for move_ in moves {
//                if move_.point == point && move_.color == color {
//                    println!("{:?}", path);
//                    break;
//                }
//            }
//        }
//    }
//}
