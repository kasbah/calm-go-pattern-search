extern crate wasm_bindgen;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

pub const BOARD_SIZE: u8 = 19;

#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Color {
    Black,
    White,
}

#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Point {
    pub x: u8,
    pub y: u8,
}

#[wasm_bindgen]
impl Point {
    #[wasm_bindgen(constructor)]
    pub fn new(x: u8, y: u8) -> Self {
        Self { x, y }
    }
}

#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Placement {
    pub color: Color,
    pub point: Point,
}

#[wasm_bindgen]
impl Placement {
    #[wasm_bindgen(constructor)]
    pub fn new(color: Color, point: Point) -> Self {
        Self { color, point }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
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
