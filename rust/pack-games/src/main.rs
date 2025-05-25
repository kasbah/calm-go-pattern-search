mod sgf_traversal;

use rmp_serde::Serializer;
use sgf_parse::go;
use std::collections::HashMap;

use calm_go_patterns_common::baduk::{Color, Placement, Point};

fn main() {
    let mut sgf_folder = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    sgf_folder.push("sgfs");
    let mut games = HashMap::new();
    println!("Loading games...");
    for entry in jwalk::WalkDir::new(sgf_folder) {
        let path = entry.expect("Failed to read directory entry").path();
        if path.extension().map_or(false, |ext| ext == "sgf") {
            let file_data = std::fs::read_to_string(path.clone()).expect("Failed to read file");
            if let Ok(game) = go::parse(&file_data) {
                let mut moves = Vec::new();
                for node in sgf_traversal::variation_nodes(&game[0], 0).unwrap() {
                    for props in &node.sgf_node.properties {
                        match props {
                            go::Prop::W(go::Move::Move(point)) => {
                                moves.push(Placement {
                                    color: Color::White,
                                    point: Point {
                                        x: point.x,
                                        y: point.y,
                                    },
                                });
                                break;
                            }
                            go::Prop::B(go::Move::Move(point)) => {
                                moves.push(Placement {
                                    color: Color::Black,
                                    point: Point {
                                        x: point.x,
                                        y: point.y,
                                    },
                                });
                                break;
                            }
                            _ => {}
                        }
                    }
                }

                games.insert(path.to_string_lossy().into_owned(), moves);
            }
        }
    }
    println!("Writing games.pack...");
    let mut buf = Vec::new();
    games.serialize(&mut Serializer::new(&mut buf)).unwrap();
    std::fs::write("games.pack", buf).unwrap();
    println!("Done");
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
