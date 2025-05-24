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
    R90,
    R180,
    R270,
}

#[wasm_bindgen]
pub struct WasmSearch {
    board_size: u8,
    game_data: HashMap<String, Vec<Placement>>,
}

#[wasm_bindgen]
impl WasmSearch {
    #[wasm_bindgen(constructor)]
    pub fn new() -> WasmSearch {
        let data = include_bytes!("games.pack");
        let mut de = Deserializer::new(&data[..]);
        let game_data: HashMap<String, Vec<Placement>> = Deserialize::deserialize(&mut de).unwrap();
        Self {
            game_data,
            board_size: 19,
        }
    }

    fn get_rotation(&self, position: Vec<Placement>, rotation: Rotation) -> Vec<Placement> {
        match rotation {
            Rotation::R90 => position
                .iter()
                .map(|p| Placement {
                    color: p.color,
                    point: Point {
                        x: self.board_size - p.point.y - 1,
                        y: p.point.x,
                    },
                })
                .collect(),
            Rotation::R180 => position
                .iter()
                .map(|p| Placement {
                    color: p.color,
                    point: Point {
                        x: self.board_size - p.point.x - 1,
                        y: self.board_size - p.point.y - 1,
                    },
                })
                .collect(),
            Rotation::R270 => position
                .iter()
                .map(|p| Placement {
                    color: p.color,
                    point: Point {
                        x: p.point.y,
                        y: self.board_size - p.point.x - 1,
                    },
                })
                .collect(),
        }
    }

    fn get_rotations(&self, position: &Vec<Placement>) -> Vec<Vec<Placement>> {
        let mut result = Vec::new();
        for rotation in &[Rotation::R90, Rotation::R180, Rotation::R270] {
            result.push(self.get_rotation(position.clone(), *rotation));
        }
        result
    }

    fn match_game(&self, position: &Vec<Placement>, moves: &Vec<Placement>) -> bool {
        for placement in position {
            if !moves.contains(placement) {
                return false;
            }
        }
        true
    }

    #[wasm_bindgen]
    pub async fn search(&self, position: Vec<Placement>) -> Vec<String> {
        let mut result = Vec::new();
        let rotations = self.get_rotations(&position);
        for (path, moves) in &self.game_data {
            if self.match_game(&position, moves) {
                result.push(path.clone());
                continue;
            }
            for rotation in &rotations {
                if self.match_game(rotation, moves) {
                    result.push(path.clone());
                    break;
                }
            }
        }
        result
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
