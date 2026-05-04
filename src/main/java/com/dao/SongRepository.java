package com.dao;
import com.entity.*;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SongRepository extends JpaRepository<Song, Long> {
	
	    List<Song> findByGenre(String genre);
	    List<Song> findByMood(String mood);
	}


