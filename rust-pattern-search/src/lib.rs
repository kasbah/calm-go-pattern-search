extern crate cfg_if;
extern crate wasm_bindgen;

mod utils;

use cfg_if::cfg_if;
use wasm_bindgen::prelude::*;
use sgf_parse::{SgfNode, go};

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
}

#[wasm_bindgen]
pub fn greet(name: &str) {
    alert(&format!("Hello,{}!", name));
}

#[cfg(test)]
mod tests {
    use super::*;

    fn load_test_sgf() -> Result<String, Box<dyn std::error::Error>> {
        // See https://www.red-bean.com/sgf/examples/
        let mut sgf_path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        sgf_path.push("badukmovies-pro-collection/1062/12/-1.sgf");
        let data = std::fs::read_to_string(sgf_path)?;

        Ok(data)
    }

    fn get_go_nodes() -> Result<Vec<SgfNode<go::Prop>>, Box<dyn std::error::Error>> {
        let data = load_test_sgf()?;

        Ok(go::parse(&data)?)
    }

    fn node_depth(mut sgf_node: &sgf_parse::SgfNode<go::Prop>) -> u64 {
        let mut depth = 1;
        while sgf_node.children().count() > 0 {
            depth += 1;
            sgf_node = sgf_node.children().next().unwrap();
        }
        depth
    }

    #[test]
    fn test_load_sgf() {
        let sgf_nodes = get_go_nodes().unwrap();
        println!("{:?}", sgf_nodes);
    }
}
