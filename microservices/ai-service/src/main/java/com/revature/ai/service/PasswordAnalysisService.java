package com.revature.ai.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.revature.ai.dto.response.PasswordAnalysisResponse;
import com.revature.ai.service.llm.LlmClientService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;

/**
 * Service for analyzing password strength using LLM
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordAnalysisService {

    private final LlmClientService llmClient;
    private final ObjectMapper objectMapper;

    private static final String SYSTEM_PROMPT = """
        You are a cybersecurity expert specializing in password security.
        Analyze the given password conceptually and provide:
        1. Strength rating (Must be exactly one of: VERY_WEAK, WEAK, MODERATE, STRONG, VERY_STRONG)
        2. List of specific vulnerabilities (array of strings)
        3. Actionable improvement suggestions (array of strings, max 3)
        
        Keep responses concise, factual, and user-friendly. Do not include markdown formatting or extra conversational text.
        Format your response strictly as valid JSON with keys: "strength", "vulnerabilities", "suggestions"
        """;

    /**
     * Analyze a password and return security analysis
     * @param password The password to analyze
     * @return PasswordAnalysisResponse with strength, vulnerabilities, and suggestions
     */
    public PasswordAnalysisResponse analyzePassword(String password) {
        String userPrompt = "Analyze this password: '" + password + "'";

        try {
            log.debug("Sending password analysis request to LLM");
            String llmResponseText = llmClient.generateCompletion(SYSTEM_PROMPT, userPrompt);
            
            return objectMapper.readValue(llmResponseText, PasswordAnalysisResponse.class);
            
        } catch (JsonProcessingException e) {
            log.error("Failed to parse LLM JSON response for password analysis", e);
            return PasswordAnalysisResponse.builder()
                    .strength("UNKNOWN")
                    .vulnerabilities(new ArrayList<>(java.util.List.of("Error evaluating password. LLM returned malformed data.")))
                    .suggestions(new ArrayList<>(java.util.List.of("Ensure the AI service is responding with valid JSON.")))
                    .build();
        } catch (Exception e) {
            log.error("Error during password analysis sequence", e);
            throw new RuntimeException("AI Password Analysis Failed", e);
        }
    }
}
