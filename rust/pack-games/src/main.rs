mod sgf_traversal;

use rayon::prelude::*;
use rmp_serde::Serializer;
use sgf_parse::go;
use std::collections::HashMap;
use serde::Serialize;

use calm_go_patterns_common::baduk::{Color, Placement, Point};

fn main() {
    let mut sgf_folder = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    sgf_folder.push("sgfs");
    let mut paths = Vec::new();

    println!("Loading games...");
    for entry in jwalk::WalkDir::new(&sgf_folder) {
        let path = entry.expect("Failed to read directory entry").path();
        if path.extension().map_or(false, |ext| ext == "sgf") {
            paths.push(path.clone());
        }
    }
    println!("Read directories");

    let games_vec = paths.par_iter()
        .filter_map(|path| {
            match std::fs::read_to_string(path) {
                Ok(file_data) => {
                    match load_sgf(&file_data) {
                        Ok(moves) => {
                            let rel_path = path.strip_prefix(&sgf_folder).unwrap().to_string_lossy().into_owned();
                            Some((rel_path, moves))
                        }
                        Err(e) => {
                            println!("Skipping {:?}: {}", path, e);
                            None
                        }
                    }
                }
                Err(e) => {
                    println!("Skipping {:?}: {}", path, e);
                    None
                }
            }
        }).collect::<Vec<_>>();

    let mut seen_moves = HashMap::new();
    let mut unique_games = HashMap::new();

    for (path, moves) in games_vec {
        if !seen_moves.contains_key(&moves) {
            seen_moves.insert(moves.clone(), true);
            unique_games.insert(path, moves);
        } else {
            println!("Removing duplicate game: {}", path);
        }
    }

    println!("Found {} unique games", unique_games.len());

    println!("Writing games.pack...");
    let mut buf = Vec::new();
    unique_games.serialize(&mut Serializer::new(&mut buf)).unwrap();
    std::fs::write("games.pack", buf).unwrap();
    println!("Done");
}

fn load_sgf(file_data: &String) -> Result<Vec<Placement>, Box<dyn std::error::Error>> {
    let game = go::parse(file_data)?;
    let mut moves = Vec::new();
    
    for node in sgf_traversal::variation_nodes(&game[0], 0)? {
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
    
    Ok(moves)
}
